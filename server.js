const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database initialization
const db = new sqlite3.Database('./traffic.db');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password TEXT NOT NULL,
        user_type TEXT DEFAULT 'user',
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Incidents table
    db.run(`CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        reported_by INTEGER,
        chat_room_active INTEGER DEFAULT 1,
        resolved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reported_by) REFERENCES users (id)
    )`);

    // Chat messages table
    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incident_id) REFERENCES incidents (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Insert sample data
    db.get("SELECT COUNT(*) as count FROM incidents", (err, row) => {
        if (row.count === 0) {
            const sampleIncidents = [
                // Critical incidents
                [28.6139, 77.2090, 'accident', 'critical', 'Major collision involving truck and 3 cars - Emergency services on site', 'Ring Road - Lajpat Nagar', null, 1, 0],
                [28.7041, 77.1025, 'accident', 'critical', 'Multi-vehicle collision on flyover - 2 lanes blocked', 'Rohini - Sector 3 Flyover', null, 1, 0],
                [28.6400, 77.1800, 'flooding', 'critical', 'Severe waterlogging - Road completely submerged', 'Karol Bagh - Main Market', null, 1, 0],
                [28.4595, 77.0266, 'accident', 'critical', 'Fatal accident on highway - All lanes closed', 'NH8 - Gurgaon Toll Plaza', null, 1, 0],
                [28.6542, 77.2373, 'fire', 'critical', 'Vehicle fire spreading - Road evacuated', 'Red Fort - Chandni Chowk', null, 1, 0],
                
                // High severity incidents  
                [28.6100, 77.2400, 'protest', 'high', 'Large protest march - Road partially blocked', 'India Gate - Rajpath', null, 1, 0],
                [28.5532, 77.2750, 'accident', 'high', 'Chain collision in tunnel - Heavy backup', 'Lodhi Road Tunnel', null, 1, 0],
                [28.6304, 77.2177, 'construction', 'high', 'Emergency gas line repair - Major diversions', 'Connaught Place - Inner Circle', null, 1, 0],
                [28.5167, 77.2167, 'vip', 'high', 'Presidential convoy - Complete road closure', 'Rashtrapati Bhavan - Raisina Hill', null, 0, 0],
                [28.6562, 77.2410, 'breakdown', 'high', 'DTC bus breakdown - Blocking 2 lanes', 'ISBT Kashmere Gate', null, 1, 0],
                [28.5245, 77.1855, 'flooding', 'high', 'Overflowing drain - Traffic crawling', 'Airport Road - T3 Terminal', null, 1, 0],
                
                // Medium severity incidents
                [28.6500, 77.2100, 'breakdown', 'medium', 'Auto breakdown in right lane - Being cleared', 'ITO - Ring Road Junction', null, 1, 0],
                [28.5800, 77.3200, 'construction', 'medium', 'Metro construction work - Single lane open', 'Gurgaon - Cyber City', null, 1, 0],
                [28.6667, 77.2167, 'traffic_jam', 'medium', 'Heavy rush hour traffic - Moving slowly', 'University - North Campus', null, 1, 0],
                [28.6139, 77.2290, 'accident', 'medium', 'Two-wheeler accident - Lane partially blocked', 'Lajpat Nagar Market', null, 1, 0],
                [28.5355, 77.3910, 'construction', 'medium', 'Road resurfacing work - Expect delays', 'Noida - Sector 18', null, 1, 0],
                [28.7230, 77.1200, 'breakdown', 'medium', 'Taxi breakdown - Right lane affected', 'Pitampura Metro Station', null, 1, 0],
                [28.6700, 77.2300, 'traffic_jam', 'medium', 'School zone congestion - Peak hours', 'GTB Nagar - Mall Road', null, 1, 0],
                
                // Low severity incidents
                [28.5355, 77.3910, 'breakdown', 'low', 'Car breakdown in left lane - Towing arranged', 'Noida Expressway - Sector 18', null, 1, 0],
                [28.6700, 77.2300, 'accident', 'low', 'Minor fender bender - Vehicles being moved', 'GTB Nagar Metro Station', null, 1, 0],
                [28.6200, 77.2700, 'construction', 'low', 'Footpath repair work - Traffic unaffected', 'Yamuna Bank Metro Station', null, 1, 0],
                [28.5900, 77.2100, 'breakdown', 'low', 'Puncture repair on roadside - No obstruction', 'Pragati Maidan', null, 1, 0],
                [28.6800, 77.2200, 'traffic_jam', 'low', 'Market day congestion - Moving steadily', 'Azadpur Mandi', null, 1, 0],
                [28.5700, 77.3100, 'construction', 'low', 'Utility maintenance - Traffic flowing', 'Gurgaon - Golf Course Road', null, 1, 0],
                [28.6300, 77.2500, 'breakdown', 'low', 'Cycle rickshaw repair - Side lane only', 'Old Delhi Railway Station', null, 1, 0],
                
                // Additional diverse incidents
                [28.4817, 77.1873, 'accident', 'high', 'Bus-truck collision - Emergency response active', 'MG Road - Gurgaon', null, 1, 0],
                [28.7333, 77.1167, 'flooding', 'medium', 'Monsoon waterlogging - Slow movement', 'Bawana Industrial Area', null, 1, 0],
                [28.5833, 77.3167, 'vip', 'medium', 'Minister visit - Partial road closure', 'Noida - Sector 62', null, 0, 0],
                [28.6083, 77.2750, 'protest', 'low', 'Student march - Sidewalk only', 'Jamia Millia Islamia', null, 1, 0],
                [28.4167, 77.0417, 'construction', 'high', 'Bridge repair work - Major detour required', 'Manesar - IMT', null, 1, 0],
                [28.6917, 77.2083, 'breakdown', 'medium', 'Truck breakdown - Blocking slow lane', 'Wazirabad - GT Road', null, 1, 0],
                [28.5583, 77.2500, 'accident', 'low', 'Auto-rickshaw minor collision - Clearing up', 'Nizamuddin Railway Station', null, 1, 0],
                [28.6417, 77.3750, 'traffic_jam', 'medium', 'IT office rush - Heavy but moving', 'Mayur Vihar Phase 1', null, 1, 0],
                [28.7167, 77.2667, 'construction', 'low', 'Street light installation - Minimal impact', 'Shalimar Bagh', null, 1, 0],
                
                // More comprehensive incidents for better coverage
                [28.5267, 77.2056, 'weather', 'medium', 'Dense fog reducing visibility - Drive slow', 'Airport Express Highway', null, 1, 0],
                [28.6928, 77.1514, 'breakdown', 'high', 'Multiple vehicle breakdown - Lane blocked', 'Rohini - Sector 18', null, 1, 0],
                [28.5678, 77.3234, 'construction', 'critical', 'Metro line construction - All lanes affected', 'Noida - Film City', null, 1, 0],
                [28.4456, 77.0123, 'accident', 'critical', 'Fatal multi-car accident - Highway closed', 'Gurgaon - Manesar Highway', null, 1, 0],
                [28.6789, 77.1234, 'fire', 'high', 'Bus fire incident - Emergency evacuation', 'Punjabi Bagh Metro Station', null, 1, 0],
                [28.5345, 77.2876, 'flooding', 'high', 'Drain overflow - Cars stuck in water', 'Patparganj Industrial Area', null, 1, 0],
                [28.7123, 77.0987, 'protest', 'medium', 'Farmers protest march - Partial blockage', 'Outer Ring Road - Nangloi', null, 1, 0],
                [28.6234, 77.3456, 'vip', 'critical', 'Presidential convoy - Complete road closure', 'Akshardham - Noida Link Road', null, 0, 0],
                [28.5567, 77.1789, 'breakdown', 'low', 'Motorcycle breakdown - Side cleared', 'Mehrauli - Gurgaon Road', null, 1, 0],
                [28.6678, 77.2345, 'construction', 'medium', 'Flyover repair work - Single lane open', 'ISBT - Kashmere Gate Flyover', null, 1, 0],
                [28.4567, 77.3123, 'traffic_jam', 'high', 'School zone congestion - Peak hours', 'Greater Noida - Beta 2', null, 1, 0],
                [28.7345, 77.1567, 'weather', 'low', 'Light rain - Slippery roads', 'Rohini - Sector 14', null, 1, 0],
                [28.5789, 77.2567, 'accident', 'medium', 'Two-wheeler vs car collision - Lane blocked', 'Lodi Road - Safdarjung', null, 1, 0],
                [28.6456, 77.3234, 'breakdown', 'medium', 'Bus engine failure - Right lane blocked', 'Shahdara - GT Road', null, 1, 0],
                [28.4789, 77.1456, 'construction', 'high', 'Underground cable laying - Major delays', 'Cyber Hub - Gurgaon', null, 1, 0],
                [28.7012, 77.2234, 'protest', 'high', 'Political rally - Road completely blocked', 'Model Town - GT Road', null, 1, 0],
                [28.5234, 77.3567, 'flooding', 'critical', 'Bridge waterlogged - Completely impassable', 'Yamuna Bridge - Noida', null, 1, 0],
                [28.6567, 77.1789, 'vip', 'medium', 'Diplomatic convoy - Temporary closure', 'Chanakyapuri - Embassy Area', null, 0, 0],
                [28.4678, 77.2456, 'fire', 'medium', 'Roadside shop fire - Smoke affecting traffic', 'Dhaula Kuan - Ring Road', null, 1, 0],
                [28.7234, 77.3456, 'breakdown', 'high', 'Truck overturned - Emergency clearing', 'Wazirabad - Yamuna Bridge', null, 1, 0]
            ];

            const stmt = db.prepare(`INSERT INTO incidents (lat, lng, type, severity, description, location, reported_by, chat_room_active, resolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            sampleIncidents.forEach(incident => {
                stmt.run(...incident);
            });
            stmt.finalize();
        }
    });
    
    // Insert sample users for demo
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (row.count === 0) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            
            // Create extensive demo users
            const demoUsers = [
                ['Demo User', 'user@demo.com', '+91 9876543210', 'demo123', 'user'],
                ['Demo Admin', 'admin@demo.com', '+91 9876543211', 'admin123', 'admin'],
                ['Verified Helper', 'helper@demo.com', '+91 9876543212', 'helper123', 'helper'],
                ['Rahul Singh', 'rahul.driver@gmail.com', '+91 9876543213', 'demo123', 'user'],
                ['Priya Sharma', 'priya.commuter@outlook.com', '+91 9876543214', 'demo123', 'helper'],
                ['Mohammed Ali', 'ali.driver@yahoo.com', '+91 9876543215', 'demo123', 'user'],
                ['Sarah Johnson', 'sarah.expat@gmail.com', '+91 9876543216', 'demo123', 'user'],
                ['Traffic Helper Delhi', 'helper.delhi@trafficapp.com', '+91 9876543217', 'demo123', 'helper'],
                ['Mumbai Traffic Guide', 'mumbai.guide@trafficapp.com', '+91 9876543218', 'demo123', 'helper'],
                ['Bangalore Commuter', 'blr.commuter@techie.com', '+91 9876543219', 'demo123', 'user'],
                ['Delhi Police Traffic', 'traffic.police@delhi.gov.in', '+91 9876543220', 'demo123', 'admin'],
                ['Highway Patrol', 'highway.patrol@transport.gov.in', '+91 9876543221', 'demo123', 'admin'],
                ['Emergency Responder', 'emergency@ambulance.org', '+91 9876543222', 'demo123', 'helper'],
                ['Local Traffic Volunteer', 'volunteer@traffic.community', '+91 9876543223', 'demo123', 'helper'],
                ['Truck Driver Kumar', 'kumar.transport@logistics.com', '+91 9876543224', 'demo123', 'user'],
                ['AutoDriver_Delhi', 'auto.driver@delhi.transport', '+91 9876543225', 'demo123', 'user'],
                ['Metro Commuter', 'metro.daily@commute.in', '+91 9876543226', 'demo123', 'user'],
                ['School Bus Driver', 'school.transport@education.org', '+91 9876543227', 'demo123', 'user'],
                ['Delivery Executive', 'delivery.fast@ecommerce.com', '+91 9876543228', 'demo123', 'user'],
                ['Traffic Reporter', 'reporter@traffic.news', '+91 9876543229', 'demo123', 'helper']
            ];
            
            demoUsers.forEach(async ([name, email, phone, password, type]) => {
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                db.run('INSERT OR IGNORE INTO users (name, email, phone, password, user_type, verified) VALUES (?, ?, ?, ?, ?, ?)', 
                    [name, email, phone, hashedPassword, type, 1]);
            });
        }
    });
    
    // Insert sample chat messages
    setTimeout(() => {
        db.get("SELECT COUNT(*) as count FROM chat_messages", (err, row) => {
            if (row.count === 0) {
                const sampleMessages = [
                    // Ring Road Major Accident Chatroom (Incident 1 - Critical)
                    [1, 4, 'I\'m stuck right behind this accident. Multiple ambulances arrived 5 minutes ago.', 'text'],
                    [1, 8, 'ℹ️ VERIFIED: Major collision confirmed. 3 vehicles involved. Emergency services on site.', 'text'],
                    [1, 1, 'Can someone guide me to alternate route? I have important meeting in 30 mins.', 'text'],
                    [1, 5, 'Take Ring Road inner circle -> CP Metro -> bypass completely. Added 15 mins but moving.', 'text'],
                    [1, 12, '🚑 AMBULANCE UPDATE: Patient being transferred to AIIMS. Please clear emergency lane.', 'text'],
                    [1, 6, 'सभी लोग कृपया emergency vehicles को रास्ता दें', 'text'],
                    [1, 9, '[AI TRANSLATED] Everyone please give way to emergency vehicles', 'text'],
                    [1, 4, 'Tow truck arrived. They\'re clearing the left lane first.', 'text'],
                    [1, 8, 'ETA for complete clearance: 25-30 minutes based on current progress.', 'text'],
                    
                    // Rohini Flyover Accident Chatroom (Incident 2 - Critical)
                    [2, 7, '🚨 CRITICAL: Multi-car pileup on Rohini flyover. Both lanes blocked!', 'text'],
                    [2, 11, 'I can see from my apartment - at least 5 cars involved. Fire brigade coming.', 'text'],
                    [2, 14, 'Alternative: Take Pitampura route -> Outer Ring Road. Adding 20 mins but moving.', 'text'],
                    [2, 1, 'Any updates on injuries? Looks serious from traffic buildup.', 'text'],
                    [2, 12, 'Emergency services treating patients on site. Please avoid area for next hour.', 'text'],
                    [2, 15, 'मैं यहाँ से वापिस जा रहा हूँ। बहुत बड़ा जाम है।', 'text'],
                    [2, 9, '[AI TRANSLATED] I\'m returning from here. Very big traffic jam.', 'text'],
                    
                    // Karol Bagh Flooding Chatroom (Incident 3 - Critical)
                    [3, 16, '🌊 DANGER: Water level rising rapidly. Cars getting stuck!', 'text'],
                    [3, 8, 'Water main burst confirmed. Delhi Jal Board teams en route.', 'text'],
                    [3, 4, 'My car engine died in the water. Need help! Near Main Market.', 'text'],
                    [3, 13, 'Rescue team dispatched to Main Market area. Stay in vehicle if safe.', 'text'],
                    [3, 17, 'पानी बहुत तेजी से बढ़ रहा है। कृपया इस इलाके से बचें।', 'text'],
                    [3, 9, '[AI TRANSLATED] Water is rising very fast. Please avoid this area.', 'text'],
                    [3, 11, 'DTC buses suspended on this route. Use Metro - Karol Bagh station operational.', 'text'],
                    
                    // India Gate Protest Chatroom (Incident 6 - High)
                    [6, 6, 'Peaceful protest march started from India Gate. Road partially blocked.', 'text'],
                    [6, 10, 'Police estimate 2-3 hours for complete clearance. Plan accordingly.', 'text'],
                    [6, 18, 'Side roads are open. Use Janpath -> Connaught Place route.', 'text'],
                    [6, 1, 'Is Rajpath completely closed or just one side?', 'text'],
                    [6, 8, 'OFFICIAL: Only northbound Rajpath affected. Southbound lanes operational.', 'text'],
                    [6, 19, 'Protesters are very disciplined. Not blocking emergency vehicles.', 'text'],
                    
                    // Connaught Place Construction Chatroom (Incident 8 - High)
                    [8, 5, 'Gas line repair work started this morning. Only outer circle operational.', 'text'],
                    [8, 20, 'Inner circle completely barricaded. Emergency repair after gas leak detected.', 'text'],
                    [8, 1, 'How long is this expected to take? I work in CP daily.', 'text'],
                    [8, 8, 'Delhi Gas Authority estimates 48-72 hours for complete repair.', 'text'],
                    [8, 14, 'Use Metro! All central Delhi metro lines are running normally.', 'text'],
                    [8, 7, 'Parking will be nightmare. Better to use public transport this week.', 'text'],
                    
                    // Cyber City Construction Chatroom (Incident 14 - Medium)
                    [14, 15, 'Metro construction causing delays but traffic is moving slowly.', 'text'],
                    [14, 16, 'Left lane open for light vehicles. Trucks using service road.', 'text'],
                    [14, 18, 'Office timings flexible this week due to construction. Check with HR.', 'text'],
                    [14, 1, 'Any updates on when construction will be completed?', 'text'],
                    [14, 8, 'Delhi Metro estimates 6 months for this phase. Long-term project.', 'text'],
                    
                    // University Area Rush Hour Chatroom (Incident 15 - Medium)
                    [15, 17, 'DU evening classes causing usual rush hour congestion.', 'text'],
                    [15, 19, 'Students mostly using Metro. Road traffic lighter than expected.', 'text'],
                    [15, 4, 'Best time to cross this area is before 5 PM or after 8 PM.', 'text'],
                    [15, 6, 'Bus frequency increased during peak hours. DTC doing good job.', 'text'],
                    
                    // Noida IT Hub Rush Chatroom (Incident 22 - Medium)
                    [22, 15, 'IT office peak hours. Traffic heavy but steadily moving.', 'text'],
                    [22, 16, 'Corporate shuttles running on time. Minimal delays expected.', 'text'],
                    [22, 18, 'Cab sharing working well. Uber/Ola pool recommended.', 'text'],
                    [22, 7, 'Metro extension really helping reduce road traffic in this sector.', 'text'],
                    
                    // Low severity quick updates
                    [18, 4, 'Minor fender bender cleared. Traffic back to normal at GTB Nagar.', 'text'],
                    [19, 8, 'Footpath repair work not affecting traffic. Business as usual.', 'text'],
                    [20, 11, 'Puncture fixed, vehicle moved. No more obstruction at Pragati Maidan.', 'text'],
                    [21, 16, 'Market day crowds thinning out. Traffic improving at Azadpur.', 'text'],
                    [23, 5, 'Rickshaw repair completed. Side lane fully clear now.', 'text'],
                    
                    // Emergency and official updates
                    [1, 11, '🚨 TRAFFIC POLICE: Accident investigation underway. Expect delays till 6 PM.', 'text'],
                    [3, 13, '🚑 EMERGENCY: Water rescue operations in progress. Avoid Karol Bagh completely.', 'text'],
                    [6, 10, '👮 POLICE UPDATE: Protest peaceful. Traffic diversions working effectively.', 'text'],
                    [8, 11, '🔧 DELHI GAS: Safety first. Gas leak contained. Repair work continues.', 'text'],
                    
                    // Multilingual updates with translations
                    [1, 17, 'दुर्घटना के कारण बहुत जाम है। वैकल्पिक रास्ता अपनाएं।', 'text'],
                    [1, 9, '[AI TRANSLATED] Very jammed due to accident. Take alternative route.', 'text'],
                    [6, 18, 'यह विरोध प्रदर्शन शांतिपूर्ण है। घबराने की जरूरत नहीं।', 'text'],
                    [6, 9, '[AI TRANSLATED] This protest is peaceful. No need to panic.', 'text'],
                    [14, 16, 'मेट्रो निर्माण चल रहा है। धैर्य रखें।', 'text'],
                    [14, 9, '[AI TRANSLATED] Metro construction is ongoing. Please be patient.', 'text']
                ];
                
                const stmt = db.prepare('INSERT INTO chat_messages (incident_id, user_id, message, message_type) VALUES (?, ?, ?, ?)');
                sampleMessages.forEach(([incident_id, user_id, message, type]) => {
                    stmt.run(incident_id, user_id, message, type);
                });
                stmt.finalize();
            }
        });
    }, 1000);
});

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// API Routes

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, userType } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (name, email, phone, password, user_type) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, hashedPassword, userType],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Failed to create user' });
                }
                
                const token = jwt.sign({ 
                    id: this.lastID, 
                    email: email, 
                    name: name, 
                    type: userType 
                }, JWT_SECRET, { expiresIn: '24h' });
                
                res.status(201).json({
                    message: 'User created successfully',
                    token: token,
                    user: {
                        id: this.lastID,
                        name: name,
                        email: email,
                        type: userType
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        
        db.get('SELECT * FROM users WHERE email = ? AND user_type = ?', [email, userType], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const token = jwt.sign({
                id: user.id,
                email: user.email,
                name: user.name,
                type: user.user_type
            }, JWT_SECRET, { expiresIn: '24h' });
            
            res.json({
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    type: user.user_type
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Incidents Routes
app.get('/api/incidents', (req, res) => {
    const query = `
        SELECT i.*, u.name as reported_by_name 
        FROM incidents i 
        LEFT JOIN users u ON i.reported_by = u.id 
        WHERE i.resolved = 0
        ORDER BY i.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch incidents' });
        }
        
        const incidents = rows.map(row => ({
            id: row.id,
            lat: row.lat,
            lng: row.lng,
            type: row.type,
            severity: row.severity,
            description: row.description,
            location: row.location,
            reportedBy: row.reported_by_name || 'Anonymous',
            reportedById: row.reported_by,
            chatRoomActive: row.chat_room_active === 1,
            timestamp: new Date(row.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        }));
        
        res.json(incidents);
    });
});

app.post('/api/incidents', authenticateToken, (req, res) => {
    const { lat, lng, type, severity, description, location } = req.body;
    
    db.run(
        'INSERT INTO incidents (lat, lng, type, severity, description, location, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [lat, lng, type, severity, description, location, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create incident' });
            }
            
            const newIncident = {
                id: this.lastID,
                lat: lat,
                lng: lng,
                type: type,
                severity: severity,
                description: description,
                location: location,
                reportedBy: req.user.name,
                reportedById: req.user.id,
                chatRoomActive: true,
                timestamp: new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                })
            };
            
            // Broadcast new incident to all connected clients
            io.emit('new-incident', newIncident);
            
            res.status(201).json({
                message: 'Incident created successfully',
                incident: newIncident
            });
        }
    );
});

// Chat Routes
app.get('/api/incidents/:id/messages', (req, res) => {
    const incidentId = req.params.id;
    
    const query = `
        SELECT cm.*, u.name as user_name, u.user_type 
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.incident_id = ?
        ORDER BY cm.created_at ASC
    `;
    
    db.all(query, [incidentId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
        
        const messages = rows.map(row => ({
            id: row.id,
            message: row.message,
            userName: row.user_name,
            userType: row.user_type,
            timestamp: new Date(row.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }),
            messageType: row.message_type
        }));
        
        res.json(messages);
    });
});

app.post('/api/incidents/:id/messages', authenticateToken, (req, res) => {
    const incidentId = req.params.id;
    const { message } = req.body;
    
    // Simple inappropriate content filter
    const inappropriateWords = ['idiot', 'stupid', 'fool', 'moron', 'dumb'];
    const hasInappropriateContent = inappropriateWords.some(word => 
        message.toLowerCase().includes(word.toLowerCase())
    );
    
    if (hasInappropriateContent) {
        return res.status(400).json({ 
            error: 'Message contains inappropriate language and was blocked by AI moderation.' 
        });
    }
    
    db.run(
        'INSERT INTO chat_messages (incident_id, user_id, message) VALUES (?, ?, ?)',
        [incidentId, req.user.id, message],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to send message' });
            }
            
            const newMessage = {
                id: this.lastID,
                message: message,
                userName: req.user.name,
                userType: req.user.type,
                timestamp: new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }),
                messageType: 'text'
            };
            
            // Broadcast message to incident chatroom
            io.to(`incident-${incidentId}`).emit('new-message', {
                incidentId: incidentId,
                message: newMessage
            });
            
            res.status(201).json({
                message: 'Message sent successfully',
                chatMessage: newMessage
            });
        }
    );
});

// User Stats Route
app.get('/api/user/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Get user's incident count
    db.get('SELECT COUNT(*) as incident_count FROM incidents WHERE reported_by = ?', [userId], (err, incidentRow) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch stats' });
        }
        
        // Get user's message count
        db.get('SELECT COUNT(*) as message_count FROM chat_messages WHERE user_id = ?', [userId], (err, messageRow) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch stats' });
            }
            
            res.json({
                incidentsReported: incidentRow.incident_count,
                messagesPosted: messageRow.message_count,
                chatroomsJoined: Math.floor(Math.random() * 10) + 1 // Simulated for demo
            });
        });
    });
});

// Socket.IO for real-time communication
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join incident chatroom
    socket.on('join-incident', (incidentId) => {
        socket.join(`incident-${incidentId}`);
        console.log(`User ${socket.id} joined incident ${incidentId} chatroom`);
    });
    
    // Leave incident chatroom
    socket.on('leave-incident', (incidentId) => {
        socket.leave(`incident-${incidentId}`);
        console.log(`User ${socket.id} left incident ${incidentId} chatroom`);
    });
    
    // Handle real-time chat messages
    socket.on('send-message', async (data) => {
        const { incidentId, message, token } = data;
        
        try {
            // Verify JWT token
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Save message to database
            db.run(
                'INSERT INTO chat_messages (incident_id, user_id, message) VALUES (?, ?, ?)',
                [incidentId, decoded.id, message],
                function(err) {
                    if (err) {
                        socket.emit('message-error', { error: 'Failed to send message' });
                        return;
                    }
                    
                    const newMessage = {
                        id: this.lastID,
                        message: message,
                        userName: decoded.name,
                        userType: decoded.type,
                        timestamp: new Date().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }),
                        messageType: 'text'
                    };
                    
                    // Broadcast to all users in the incident chatroom
                    io.to(`incident-${incidentId}`).emit('new-message', {
                        incidentId: incidentId,
                        message: newMessage
                    });
                }
            );
        } catch (error) {
            socket.emit('message-error', { error: 'Authentication failed' });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚦 Smart Traffic Platform Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: Connected and ready for real-time communication`);
});
