const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;
const BASE_DIR = path.join(__dirname, 'user-assets-storage');

// In-memory user storage for demonstration purposes
const users = {};

// Middleware to parse JSON bodies
app.use(express.json());

// Create a new user account
app.post('/create-account', (req, res) => {
  const { name } = req.body;

  // Check if a user with the same name already exists
  const userExists = Object.values(users).some(user => user.name === name);
  if (userExists) {
    return res.status(400).json({ message: 'User with this name already exists' });
  }

  // Generate a unique folder name
  const folderName = `${name}-${uuidv4()}`;
  const userId = uuidv4();

  // Store user information
  users[userId] = { name, folderName };

  console.log('User ID created:', userId);

  // Create the user folder path
  const userFolderPath = path.join(BASE_DIR, folderName);

  // Create the directory
  fs.mkdir(userFolderPath, { recursive: true }, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to create user folder' });
    }

    res.status(200).json({ message: 'User folder created', userId });
  });
});

// Delete a user account
app.delete('/delete-account/:userId', (req, res) => {
  const { userId } = req.params;

  console.log('UserId to delete:', userId);

  // Retrieve the folder name from the in-memory storage
  const user = users[userId];
  if (!user) {
    console.log('User not found:', userId);
    return res.status(404).json({ message: 'User not found' });
  }

  const userFolderPath = path.join(BASE_DIR, user.folderName);

  // Remove the directory and its contents
  fs.rm(userFolderPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to delete user folder' });
    }

    // Remove user from in-memory storage
    delete users[userId];

    console.log('Users after deletion:', users);

    res.status(200).json({ message: 'User folder deleted' });
  });
});

// Update a user's folder name
app.patch('/update-folder/:userId', (req, res) => {
  const { userId } = req.params;
  const { newName } = req.body;

  console.log('UserId to update:', userId);

  // Retrieve the user from the in-memory storage
  const user = users[userId];
  if (!user) {
    console.log('User not found:', userId);
    return res.status(404).json({ message: 'User not found' });
  }

  // Check if a folder with the new name already exists in the file system
  const newBaseName = newName;
  const existingFolders = fs.readdirSync(BASE_DIR);
  const newFolderExists = existingFolders.some(folder => folder.startsWith(newBaseName));
  if (newFolderExists) {
    return res.status(400).json({ message: 'A folder with this name already exists' });
  }

  // Generate a new unique folder name
  const newFolderName = `${newBaseName}-${uuidv4()}`;
  const oldFolderPath = path.join(BASE_DIR, user.folderName);
  const newFolderPath = path.join(BASE_DIR, newFolderName);

  // Rename the directory
  fs.rename(oldFolderPath, newFolderPath, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to rename user folder' });
    }

    // Update the user's folder name in the in-memory storage
    user.folderName = newFolderName;

    console.log('Users after update:', users);

    res.status(200).json({ message: 'User folder renamed', newFolderName });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});