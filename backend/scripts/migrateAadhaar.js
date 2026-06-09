/**
 * Migration: Encrypt plain text aadharNumber in Student collection
 *
 * Run ONCE after deploying the new Student.js model:
 *   node backend/scripts/migrateAadhaar.js
 *
 * Safe to run multiple times — skips students already migrated.
 */

import "dotenv/config";
import mongoose from "mongoose";
import Student from "../models/Student.js";

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MONGODB_URI is missing in .env");
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB connected");

  // Find all students that still have the old plain text field
  // and haven't been migrated yet (no encrypted field present)
  const students = await Student.find({
    aadharNumber: { $exists: true, $ne: null, $ne: "" },
    aadharNumberEncrypted: null,
  }).select("+aadharHash");

  console.log(`Found ${students.length} students to migrate`);

  if (students.length === 0) {
    console.log("Nothing to migrate. Exiting.");
    await mongoose.disconnect();
    return;
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const student of students) {
    try {
      const raw = String(student.aadharNumber || "").replace(/\D/g, "");

      if (!/^\d{12}$/.test(raw)) {
        console.warn(
          `⚠️  Skipping ${student.rscNumber} — invalid Aadhaar: "${student.aadharNumber}"`
        );
        skipped++;
        continue;
      }

      student.setAadhaarNumber(raw);

      // Remove the old plain text field
      student.aadharNumber = undefined;

      await student.save();
      success++;
      console.log(`✅ Migrated: ${student.rscNumber}`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed: ${student.rscNumber} — ${err.message}`);
    }
  }

  console.log("\n── Migration complete ──────────────────────");
  console.log(`✅ Migrated : ${success}`);
  console.log(`⚠️  Skipped  : ${skipped}`);
  console.log(`❌ Failed   : ${failed}`);

  // Remove old plain text field from all documents
  const cleanup = await mongoose.connection.collection("students").updateMany(
    {},
    { $unset: { aadharNumber: "" } }
  );
  console.log(`\n🧹 Cleaned up aadharNumber field from ${cleanup.modifiedCount} documents`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration crashed:", err);
  process.exit(1);
});