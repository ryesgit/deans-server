import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'filing_system.db'));

export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          department TEXT,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_path TEXT,
          row_position INTEGER NOT NULL,
          column_position INTEGER NOT NULL,
          shelf_number INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          accessed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          file_id INTEGER,
          access_type TEXT NOT NULL,
          row_position INTEGER,
          column_position INTEGER,
          success BOOLEAN DEFAULT TRUE,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (file_id) REFERENCES files (id)
        )
      `);

      db.run(`
        INSERT OR IGNORE INTO users (user_id, name, department, email) VALUES 
        ('PUP001', 'Juan Dela Cruz', 'Engineering', 'juan.delacruz@pup.edu.ph'),
        ('PUP002', 'Maria Santos', 'Business Administration', 'maria.santos@pup.edu.ph'),
        ('PUP003', 'Jose Rizal', 'Computer Science', 'jose.rizal@pup.edu.ph')
      `);

      db.run(`
        INSERT OR IGNORE INTO files (user_id, filename, row_position, column_position, shelf_number) VALUES 
        ('PUP001', 'Engineering_Thesis_2024.pdf', 1, 3, 1),
        ('PUP001', 'Project_Documentation.pdf', 2, 1, 1),
        ('PUP002', 'Business_Plan_Final.pdf', 1, 5, 1),
        ('PUP002', 'Marketing_Research.pdf', 3, 2, 1),
        ('PUP003', 'Capstone_Project.pdf', 2, 4, 1),
        ('PUP003', 'Algorithm_Analysis.pdf', 1, 1, 1)
      `, (err) => {
        if (err) {
          console.error('Database initialization error:', err);
          reject(err);
        } else {
          console.log('✅ Database initialized successfully');
          resolve();
        }
      });
    });
  });
};

export const getUserFiles = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT f.*, u.name, u.department 
      FROM files f 
      JOIN users u ON f.user_id = u.user_id 
      WHERE f.user_id = ?
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getFileLocation = (userId, filename = null) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT f.*, u.name, u.department 
      FROM files f 
      JOIN users u ON f.user_id = u.user_id 
      WHERE f.user_id = ?
    `;
    let params = [userId];

    if (filename) {
      query += ` AND f.filename = ?`;
      params.push(filename);
    }

    query += ` ORDER BY f.created_at DESC LIMIT 1`;

    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const logAccess = (userId, fileId, accessType, rowPosition, columnPosition, success = true) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO access_logs (user_id, file_id, access_type, row_position, column_position, success)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, fileId, accessType, rowPosition, columnPosition, success], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ logId: this.lastID });
      }
    });
  });
};

export const updateFileAccess = (fileId) => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE files SET accessed_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(query, [fileId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ updated: this.changes });
      }
    });
  });
};

export { db };