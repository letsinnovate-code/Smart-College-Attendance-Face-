// scripts/ensure-indexes.js
// Utility script to create/ensure all collection indexes in MongoDB.

import mongoose from 'mongoose';
import env from '../src/config/env.js';
import logger from '../src/config/logger.js';

// Import all models to register schemas
import '../src/models/College.js';
import '../src/models/User.js';
import '../src/models/Department.js';
import '../src/models/Course.js';
import '../src/models/AcademicClass.js';
import '../src/models/Subject.js';
import '../src/models/FacultyAssignment.js';
import '../src/models/StudentEnrollment.js';
import '../src/models/FaceTemplate.js';
import '../src/models/AttendanceSession.js';
import '../src/models/AttendanceRecord.js';
import '../src/models/AttendanceCorrectionRequest.js';
import '../src/models/AuditLog.js';
import '../src/models/RefreshSession.js';
import '../src/models/Notification.js';

async function main() {
  logger.info('Connecting to MongoDB to build indexes...');
  await mongoose.connect(env.MONGODB_URI);

  const modelNames = mongoose.modelNames();
  logger.info(`Found ${modelNames.length} registered models.`);

  for (const name of modelNames) {
    const model = mongoose.model(name);
    try {
      await model.createIndexes();
      logger.info(`✅ Indexes ensured for model: ${name}`);
    } catch (err) {
      logger.error({ model: name, err: err.message }, `Failed to ensure indexes for ${name}`);
    }
  }

  logger.info('Index synchronization complete');
  await mongoose.disconnect();
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during index synchronization');
  process.exit(1);
});
