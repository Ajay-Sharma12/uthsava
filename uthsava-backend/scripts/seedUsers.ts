import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { config } from "../src/core/config";
import { User, UserStatus, Gender } from "../src/models";
import { Role } from "../src/common/types/auth.types";

const firstNames = [
  "John",
  "Jane",
  "Michael",
  "Sarah",
  "David",
  "Emily",
  "Robert",
  "Lisa",
  "William",
  "Jessica",
  "James",
  "Ashley",
  "Richard",
  "Amanda",
  "Thomas",
  "Melissa",
  "Charles",
  "Deborah",
  "Daniel",
  "Stephanie",
  "Matthew",
  "Rebecca",
  "Christopher",
  "Laura",
  "Andrew",
  "Sharon",
  "Kevin",
  "Cynthia",
  "Brian",
  "Kathleen",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Lewis",
  "Robinson",
  "Walker",
  "Hall",
];

const countryCodes = [1, 44, 91, 86, 81, 49, 33, 39, 34, 61];

const generateRandomUser = (index: number) => {
  const firstName = firstNames[randomInt(firstNames.length)];
  const lastName = lastNames[randomInt(lastNames.length)];
  const gender = Object.values(Gender)[randomInt(Object.values(Gender).length)];
  const status = randomInt(10) > 0 ? UserStatus.ACTIVE : UserStatus.INACTIVE;
  const countryCode = countryCodes[randomInt(countryCodes.length)];
  const mobile = (1000000000 + randomInt(9000000000)).toString();

  return {
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
    password: "",
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    role: Role.USER,
    gender,
    status,
    countryCode,
    mobile,
    profileImage: `avatar-${index}.jpg`,
  };
};

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);

    // Check if users already exist
    const existingCount = await User.countDocuments({ role: Role.USER });
    if (existingCount >= 50) {
      await mongoose.disconnect();
      return;
    }

    // Hash password once
    const hashedPassword = await bcrypt.hash("Password@123", 10);

    // Generate and save users one by one to trigger pre-save hook
    for (let i = 1; i <= 50; i++) {
      const userData = generateRandomUser(i);
      const user = new User({
        ...userData,
        password: hashedPassword,
      });
      await user.save();
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
