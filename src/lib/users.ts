import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "./auth";
import { ensureDataDir } from "./profile";
import type { User, UserRole } from "./types";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

interface UsersFile {
  users: User[];
}

async function readUsersFile(): Promise<UsersFile> {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw) as UsersFile;
  } catch {
    return { users: [] };
  }
}

async function writeUsersFile(data: UsersFile): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(USERS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function listUsers(): Promise<User[]> {
  const data = await readUsersFile();
  return data.users;
}

export async function getUserById(id: string): Promise<User | null> {
  const data = await readUsersFile();
  return data.users.find((user) => user.id === id) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const data = await readUsersFile();
  return data.users.find((user) => user.email === normalized) ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.length < 8) {
    throw new Error("Email and password (min 8 characters) are required.");
  }

  const data = await readUsersFile();
  if (data.users.some((user) => user.email === email)) {
    throw new Error("An account with this email already exists.");
  }

  const user: User = {
    id: uuidv4(),
    email,
    name: input.name.trim() || email.split("@")[0],
    role: input.role,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  await writeUsersFile(data);
  return user;
}

export async function updateUserPassword(userId: string, password: string): Promise<User> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const data = await readUsersFile();
  const index = data.users.findIndex((user) => user.id === userId);
  if (index === -1) {
    throw new Error("User not found.");
  }

  data.users[index] = {
    ...data.users[index],
    passwordHash: await hashPassword(password),
  };

  await writeUsersFile(data);
  return data.users[index];
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const data = await readUsersFile();
  if (data.users.some((user) => user.role === "admin")) {
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  await createUser({
    email,
    password,
    name: "Admin",
    role: "admin",
  });
}

export function sanitizeUser(user: User): Omit<User, "passwordHash"> {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
