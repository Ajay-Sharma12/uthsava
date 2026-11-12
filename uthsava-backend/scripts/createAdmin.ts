import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../src/core/config";
import { User } from "../src/models";
import { Role } from "../src/common/types/auth.types";

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);

    // Admin credentials
    const adminEmail = "octal@mailinator.com";
    const adminPassword = "Octal@1234";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      // Update admin if firstName/lastName are missing
      if (!existingAdmin.firstName || !existingAdmin.lastName) {
        existingAdmin.firstName = "Admin";
        existingAdmin.lastName = "User";
        existingAdmin.fullName = "Admin User";
        await existingAdmin.save();
      }

      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = new User({
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "User",
      fullName: "Admin User",
    });

    await admin.save();

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
