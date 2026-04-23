const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./app/config/db');
const chatRoutes = require('./app/routes/chat');
const esoRoutes = require('./app/routes/eso');
const authRoutes = require('./app/routes/auth.routes');
const patientRoutes = require('./app/routes/patient.routes');
const publicRoutes = require('./app/routes/public.routes');
const adminRoutes = require('./app/routes/admin.routes');

// Import des services RAG et Confidence (optionnels)
let ragService = null;
let confidenceService = null;

try {
    ragService = require('./app/services/ragService');
    console.log('✅ Service RAG chargé');
} catch (err) {
    console.log('⚠️ Service RAG non disponible:', err.message);
}

try {
    confidenceService = require('./app/services/confidenceService');
    console.log('✅ Service Confidence chargé');
} catch (err) {
    console.log('⚠️ Service Confidence non disponible:', err.message);
}

console.log('📌 Vérification des variables d\'environnement :');
console.log('📌 GROQ_API_KEY présente ?', process.env.GROQ_API_KEY ? 'Oui' : 'Non');
console.log('📌 USE_GROQ =', process.env.USE_GROQ);
console.log('📌 PORT =', process.env.PORT);
console.log('📌 MONGO_URI =', process.env.MONGO_URI ? 'Définie' : 'Non définie');
console.log('📌 D7_API_KEY présente ?', process.env.D7_API_KEY ? 'Oui' : 'Non');
console.log('📌 CONFIDENCE_THRESHOLD =', process.env.CONFIDENCE_THRESHOLD || '0.6 (défaut)');
console.log('📌 EMERGENCY_PHONE =', process.env.EMERGENCY_PHONE || 'Non défini');

const app = express();
const port = process.env.PORT || 5000;

// Configuration CORS améliorée
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Middleware de logging (optionnel)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`📝 ${req.method} ${req.url}`);
        next();
    });
}

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/eso', esoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Route de santé pour monitoring
app.get('/health', (req, res) => {
    const services = {
        groq: !!process.env.GROQ_API_KEY,
        d7: !!process.env.D7_API_KEY,
        rag: !!ragService,
        confidence: !!confidenceService
    };
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services,
        config: {
            confidence_threshold: process.env.CONFIDENCE_THRESHOLD || '0.6',
            emergency_phone: !!process.env.EMERGENCY_PHONE
        }
    });
});

// Route d'accueil enrichie
app.get('/', (req, res) => {
    res.json({
        name: 'MedAssist API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            chat: '/api/chat',
            eso: '/api/eso',
            auth: '/api/auth',
            patient: '/api/patient',
            public: '/api/public',
            admin: '/api/admin',
            health: '/health'
        },
        features: {
            rag: !!ragService,
            human_in_the_loop: !!process.env.D7_API_KEY,
            confidence_scoring: !!confidenceService
        }
    });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err.message);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Connexion MongoDB puis démarrage du serveur
if (require.main === module) {
    connectDB()
        .then(async () => {
            // Initialisation optionnelle des services
            if (ragService && ragService.initRAGService) {
                try {
                    await ragService.initRAGService();
                    console.log('✅ RAG Service initialisé');
                } catch (err) {
                    console.warn('⚠️ RAG Service init échouée:', err.message);
                }
            }
            
            if (confidenceService && confidenceService.initConfidenceService) {
                try {
                    confidenceService.initConfidenceService();
                    console.log('✅ Confidence Service initialisé');
                } catch (err) {
                    console.warn('⚠️ Confidence Service init échouée:', err.message);
                }
            }
            
            app.listen(port, () => {
                console.log(`🚀 Serveur backend démarré sur http://localhost:${port}`);
                console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
                console.log(`🛡️ Seuil de confiance: ${process.env.CONFIDENCE_THRESHOLD || '0.6'}`);
                console.log(`📱 SMS d'urgence: ${process.env.D7_API_KEY ? 'Activé ✅' : 'Désactivé ❌'}`);
            });
        })
        .catch(err => {
            console.error('❌ Impossible de démarrer le serveur:', err);
            process.exit(1);
        });
}

module.exports = app;