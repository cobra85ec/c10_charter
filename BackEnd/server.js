const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const DATA_FILE = './data.json'; // JSON file to store event data

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Function to read data from the JSON file
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist or is invalid, return default data
    return { events: [] };
  }
}

// Function to write data to the JSON file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Load initial data
let eventData = readData();

// API Endpoints

// Get all events
app.get('/events', (req, res) => {
  res.json(eventData);
});

// Get a specific event by eventId
app.get('/event/:eventId', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const event = eventData.events.find(e => e.eventId === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  res.json(event);
});

// Get table details for a specific event
app.get('/tables/:eventId', (req, res) => {
    const eventId = req.params.eventId;
    const event = eventData.events.find(e => e.eventId === eventId);
  
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
  
    res.json(event);  // Return the specific event data, including tables and headTable
  });

// Add a new event
app.post('/event', (req, res) => {
  const { eventId, headTable = [], tables = [] } = req.body;

  if (eventData.events.some(e => e.eventId === eventId)) {
    return res.status(400).json({ error: `Event with ID "${eventId}" already exists.` });
  }

  const newEvent = { eventId, headTable, tables };
  eventData.events.push(newEvent);
  writeData(eventData);
  
  res.json({ message: 'Event added successfully.', event: newEvent });
});

// Add a table to a specific event
app.post('/event/:eventId/table', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const { headTable = [], tables = [] } = req.body;

  const event = eventData.events.find(e => e.eventId === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Add headTable (optional)
  if (headTable.length > 0) {
    headTable.forEach(headEntry => {
      if (!event.headTable.some(h => h.id === headEntry.id)) {
        event.headTable.push(headEntry);
      }
    });
  }

  // Add tables
  if (tables.length > 0) {
    tables.forEach(newTable => {
      if (!event.tables.some(t => t.id === newTable.id)) {
        event.tables.push(newTable);
      } else {
        console.warn(`Table with ID "${newTable.id}" already exists in this event.`);
      }
    });
  }

  writeData(eventData);
  res.json({ message: 'Tables and headTable added to the event.', event });
});

// Add bulk guests to a specific table
app.post('/event/:eventId/table/:id/guest', (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const tableId = parseInt(req.params.id); // Ensure tableId is treated as an integer
    const { guests } = req.body;

    const event = eventData.events.find(e => e.eventId === eventId);
    if (!event) {
        return res.status(404).json({ error: 'Event not found.' });
    }

    const table = event.tables.find(t => t.id === tableId);
    if (!table) {
        return res.status(404).json({ error: 'Table not found.' });
    }

    // Add each guest to the table
    table.guests.push(...guests);

    // Write updated data (e.g., to a database or file)
    writeData(eventData);

    res.json({
        message: `Guests added to table ${tableId}.`,
        table: {
            id: table.id,
            guests: table.guests
        }
    });
});

// Delete a table from a specific event
app.delete('/event/:eventId/table/:id', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const tableId = parseInt(req.params.id);

  const event = eventData.events.find(e => e.eventId === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  event.tables = event.tables.filter(t => t.id !== tableId);
  writeData(eventData);
  res.json({ message: `Table ${tableId} deleted from event ${eventId}.` });
});

// Remove a guest from a specific table in a specific event
app.delete('/event/:eventId/table/:id/guest/:guestName', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const tableId = parseInt(req.params.id);
  const guestName = req.params.guestName;

  const event = eventData.events.find(e => e.eventId === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const table = event.tables.find(t => t.id === tableId);
  if (!table) {
    return res.status(404).json({ error: 'Table not found.' });
  }

  table.guests = table.guests.filter(g => g !== guestName);
  writeData(eventData);
  res.json({ message: `Guest "${guestName}" removed from table ${tableId}.`, table });
});

// Assuming express is used for the server
app.put('/event/:eventId/table/:id/guest/:guestName', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const tableId = parseInt(req.params.id); // Ensure tableId is treated as an integer
  const oldGuestName = req.params.guestName;
  const { newGuestName } = req.body; // The new guest name

  if (!newGuestName) {
      return res.status(400).json({ error: 'New guest name is required.' });
  }

  const event = eventData.events.find(e => e.eventId === eventId);
  if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
  }

  const table = event.tables.find(t => t.id === tableId);
  if (!table) {
      return res.status(404).json({ error: 'Table not found.' });
  }

  // Find and update the guest name in the table's guests array
  const guestIndex = table.guests.findIndex(guest => guest === oldGuestName);
  if (guestIndex === -1) {
      return res.status(404).json({ error: 'Guest not found.' });
  }

  table.guests[guestIndex] = newGuestName; // Update the guest name

  // Write updated data (e.g., to a database or file)
  writeData(eventData);

  res.json({
      message: `Guest ${oldGuestName} updated to ${newGuestName}.`,
      table: table
  });
});

// Add a guest to the head table in a specific event
app.post('/event/:eventId/headTable/guest', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const { guest } = req.body;

  const event = eventData.events.find(e => e.eventId === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (event.headTable[0].guests.includes(guest)) {
    return res.status(400).json({ error: 'Guest already in the head table.' });
  }

  event.headTable[0].guests.push(guest);
  
  writeData(eventData);
  res.json({ message: 'Guest added to the head table.', headTable: event.headTable });
});

// Remove a guest from the head table in a specific event
app.delete('/event/:eventId/headTable/guest/:guestName', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const guestName = req.params.guestName;

  const event = eventData.events.find(e => e.eventId === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  event.headTable = event.headTable[0].guests.filter(g => g !== guestName);
  writeData(eventData);
  res.json({ message: `Guest "${guestName}" removed from the head table.`, headTable: event.headTable });
});



// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
