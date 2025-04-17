#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const oldDirs = ["src", "app", "components", "hooks", "constants", "scripts"];
const newDir = "app-example";
const newAppDir = "src/app";
const newDirPath = path.join(root, newDir);

const indexContent = `import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
`;

const layoutContent = `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`;

const moveDirectories = async () => {
  try {
    // Create the app-example directory
    if (!fs.existsSync(newDirPath)) {
      await fs.promises.mkdir(newDirPath, { recursive: true });
      console.log(`📁 Created /${newDir} directory.`);
    }

    // Move old directories to the app-example directory
    for (const dir of oldDirs) {
      const oldDirPath = path.join(root, dir);
      const newDirPath = path.join(root, newDir, dir);

      if (fs.existsSync(oldDirPath)) {
        await fs.promises.rename(oldDirPath, newDirPath);
        console.log(`➡️ Moved /${dir} to /${newDir}/${dir}.`);
      } else {
        console.log(`❌ /${dir} does not exist, skipping.`);
      }
    }

    // Create new /app directory
    const newAppDirPath = path.join(root, newAppDir);
    await fs.promises.mkdir(newAppDirPath, { recursive: true });
    console.log("📁 Created new /app directory.");

    // Create index.tsx
    const indexPath = path.join(newAppDirPath, "index.tsx");
    await fs.promises.writeFile(indexPath, indexContent);
    console.log("📄 Created app/index.tsx.");

    // Create _layout.tsx
    const layoutPath = path.join(newAppDirPath, "_layout.tsx");
    await fs.promises.writeFile(layoutPath, layoutContent);
    console.log("📄 Created app/_layout.tsx.");

    console.log("\n✅ Project reset complete. Next steps:");
    console.log("1. Run `npx expo start` to start the development server.");
    console.log("2. Edit app/index.tsx to modify the main screen.");
    console.log("3. Delete the /app-example directory when no longer needed.");
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
};

moveDirectories();
