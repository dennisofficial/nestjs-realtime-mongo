#!/bin/bash
mongosh <<EOF
rs.initiate()

// Wait for replica set initiation
while (!rs.status().ok) {
  print("Waiting for replica set to initiate...");
  sleep(1000); // wait for 1 second
}

// Create the "testing" database
db = db.getSiblingDB('testing');
db.createCollection('users'); // Creates a collection to actually create the DB

// Verify DB creation
if(db.getName() === 'testing') {
  print("Database 'testing' created successfully.");
} else {
  print("Failed to create database 'testing'.");
}
EOF