#!/bin/bash

# This script creates dummy PDF files for seeding the database.

# Create the directory if it doesn't exist
mkdir -p uploads/seed-files

# Array of filenames
files=(
  "Engineering_Thesis_2024"
  "Project_Documentation"
  "Business_Plan_Final"
  "Marketing_Research"
  "Capstone_Project"
  "Algorithm_Analysis"
  "John_Thesis_2024"
  "Bob_Project_Report"
  "Bob_Research_Paper"
  "Administrative_Records"
)

# Loop through the files array
for file in "${files[@]}"
do
  # Create a markdown file with some dummy text
  echo "# $file

This is a dummy document for $file.
" > "uploads/seed-files/$file.md"

  # Convert the markdown file to PDF using pandoc
  pandoc "uploads/seed-files/$file.md" -o "uploads/seed-files/$file.pdf"

  # Remove the markdown file
  rm "uploads/seed-files/$file.md"

  echo "Created uploads/seed-files/$file.pdf"
done

echo "Dummy PDF files created successfully."
