require('dotenv/config');
const { Pool } = require('pg');

const resources = [
  ['ROOM', 'Lecture Hall A1', 'ROOM-A1', 'Building A - Floor 1', 'Large teaching hall with 120 seats, projector and smart board.'],
  ['ROOM', 'Lecture Hall A2', 'ROOM-A2', 'Building A - Floor 1', 'Lecture hall with 80 seats, projector and presentation screen.'],
  ['ROOM', 'Seminar Room B1', 'ROOM-B1', 'Building B - Floor 2', 'Discussion room for seminars, tutorials and group work.'],
  ['ROOM', 'Seminar Room B2', 'ROOM-B2', 'Building B - Floor 2', 'Compact seminar room with whiteboard and presentation display.'],
  ['ROOM', 'Conference Room C3', 'ROOM-C3', 'Administration Building', 'Hybrid meeting room with video conferencing and interactive display.'],
  ['ROOM', 'Study Room L201', 'ROOM-L201', 'Library - Floor 2', 'Quiet group-study room with power outlets, whiteboard and campus Wi-Fi.'],
  ['ROOM', 'Study Room L202', 'ROOM-L202', 'Library - Floor 2', 'Quiet study room for project teams and supervised academic work.'],
  ['ROOM', 'University Auditorium', 'ROOM-AUD', 'Main Building', 'Large auditorium for lectures, presentations and university events.'],

  ['LAB', 'Computer Laboratory', 'LAB-COMP', 'Technology Building', 'Networked desktop computers for programming, coursework and practical sessions.'],
  ['LAB', 'Artificial Intelligence Laboratory', 'LAB-AI', 'Technology Building - Floor 3', 'GPU workstations with machine-learning and data-science software.'],
  ['LAB', 'Physics Laboratory', 'LAB-PHY', 'Science Block', 'Supervised physics laboratory with measurement and experimental equipment.'],
  ['LAB', 'Electronics Laboratory', 'LAB-ELC', 'Engineering Block', 'Electronics benches with power supplies, meters and prototyping tools.'],
  ['LAB', '3D Printer - Prusa i3', 'LAB-3DP-01', 'Fabrication Lab', 'FDM 3D printer for prototypes, coursework and student engineering projects.'],
  ['LAB', 'Optical Microscope', 'LAB-MIC-01', 'Biology Laboratory', 'Optical microscope for supervised biology and materials observation.'],
  ['LAB', 'Digital Oscilloscope 100 MHz', 'LAB-OSC-01', 'Electronics Laboratory', 'Digital oscilloscope for signal measurement, debugging and electronics practical work.'],
  ['LAB', 'Soldering Station', 'LAB-SOLD-01', 'Electronics Laboratory', 'Temperature-controlled soldering station with stand and safety accessories.'],
  ['LAB', 'Raspberry Pi Development Kit', 'LAB-RPI-01', 'Embedded Systems Lab', 'Raspberry Pi development kit with sensors, power supply and prototyping accessories.'],
  ['LAB', 'Arduino Robotics Kit', 'LAB-ROB-01', 'Robotics Laboratory', 'Arduino-based mobile robotics kit for control, sensing and prototyping projects.'],
  ['LAB', 'VR Research Headset', 'LAB-VR-01', 'Immersive Systems Lab', 'Virtual-reality headset for visualization, simulation and interaction research.'],
  ['LAB', 'High-Performance Laptop', 'LAB-LAP-01', 'Technology Building', 'Portable development laptop for CAD, programming and project demonstrations.'],

  ['MEDIA', 'DSLR Camera Canon 01', 'MEDIA-CAM-01', 'Media Office', 'DSLR camera with lens, charger and memory card for university media projects.'],
  ['MEDIA', 'Video Camera Sony 01', 'MEDIA-VID-01', 'Media Office', 'Video camera for interviews, lectures and event recording.'],
  ['MEDIA', 'Portable Projector 01', 'MEDIA-PROJ-01', 'Media Office', 'Full HD portable projector with HDMI and USB-C adapters.'],
  ['MEDIA', 'Wireless Microphone Kit', 'MEDIA-MIC-01', 'Media Office', 'Wireless microphone set for interviews, presentations and events.'],
  ['MEDIA', 'Podcast Audio Kit', 'MEDIA-POD-01', 'Media Studio', 'Portable recorder, two microphones, cables and headphones for podcast production.'],
  ['MEDIA', 'Studio Lighting Kit', 'MEDIA-LIGHT-01', 'Media Studio', 'LED panels, stands, softboxes and power accessories for photo and video work.'],
  ['MEDIA', 'Tripod Heavy Duty', 'MEDIA-TRI-01', 'Media Office', 'Professional tripod for DSLR and video-camera stabilization.'],
  ['MEDIA', 'Portable Projection Screen', 'MEDIA-SCREEN-01', 'Media Office', 'Foldable projection screen for classrooms and university events.'],
  ['MEDIA', 'Camera Gimbal Stabilizer', 'MEDIA-GIM-01', 'Media Office', 'Three-axis motorized gimbal for smooth mobile and camera video.'],
  ['MEDIA', 'Action Camera Kit', 'MEDIA-ACT-01', 'Media Office', 'Compact action camera with batteries, mounts and protective case.'],
  ['MEDIA', 'USB Audio Interface', 'MEDIA-AUDIO-01', 'Media Studio', 'Two-channel audio interface for microphones, instruments and recording.'],
  ['MEDIA', 'Portable Green Screen', 'MEDIA-GREEN-01', 'Media Studio', 'Portable chroma-key background for video production and streaming.'],

  ['SPORT', 'Football Kit', 'SPORT-FOOT-01', 'Sports Center', 'Football set with balls, cones and training bibs.'],
  ['SPORT', 'Basketball Kit', 'SPORT-BASK-01', 'Sports Center', 'Basketballs, bibs and portable training accessories.'],
  ['SPORT', 'Volleyball Kit', 'SPORT-VOLL-01', 'Sports Center', 'Volleyball, portable net and court markers.'],
  ['SPORT', 'Tennis Racket Set', 'SPORT-TENN-01', 'Sports Center', 'Tennis rackets and balls for university courts.'],
  ['SPORT', 'Table Tennis Kit', 'SPORT-TT-01', 'Sports Center', 'Paddles, balls and portable net set.'],
  ['SPORT', 'Training Cones Set', 'SPORT-CONE-01', 'Sports Storage', 'High-visibility cones for training sessions and campus events.'],
  ['SPORT', 'Indoor Court Slot', 'SPORT-COURT-IN', 'Sports Hall', 'Reservable indoor multi-sport court time slot.'],
  ['SPORT', 'Outdoor Field Slot', 'SPORT-FIELD-OUT', 'Sports Center', 'Reservable outdoor field for training and student activities.'],

  ...Array.from({ length: 30 }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    return [
      'PARKING',
      `Parking Slot P-${number}`,
      `PARK-${number}`,
      'University Main Parking',
      'Numbered student parking space with campus access control.',
    ];
  }),
];

function validateCatalog() {
  const tags = new Set();
  for (const [category, name, inventoryTag, location, description] of resources) {
    if (![category, name, inventoryTag, location, description].every((value) => typeof value === 'string' && value.trim())) {
      throw new Error(`Invalid resource seed row: ${JSON.stringify([category, name, inventoryTag, location, description])}`);
    }
    if (tags.has(inventoryTag)) throw new Error(`Duplicate inventory tag in seed catalog: ${inventoryTag}`);
    tags.add(inventoryTag);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  validateCatalog();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const [category, name, inventoryTag, location, description] of resources) {
      await client.query(
        `INSERT INTO "Equipment"(
          "id", "name", "category", "inventoryTag", "location", "status", "description", "createdAt", "updatedAt"
        ) VALUES(
          concat('seed_', md5($3)), $2, $1, $3, $4, 'AVAILABLE', $5, now(), now()
        )
        ON CONFLICT("inventoryTag") DO UPDATE SET
          "name" = EXCLUDED."name",
          "category" = EXCLUDED."category",
          "location" = EXCLUDED."location",
          "description" = EXCLUDED."description",
          "updatedAt" = now()`,
        [category, name, inventoryTag, location, description],
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded or refreshed ${resources.length} university resources`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
