import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Validación de sesión
if (sessionStorage.getItem('clinica_auth') !== 'true') {
    window.location.href = 'index.html';
}

window.logout = function() {
    sessionStorage.removeItem('clinica_auth');
    window.location.href = 'index.html';
}

// Credenciales de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCJietA0GuHsUpkN2-lk38Y3L6VDROxvZs",
    authDomain: "materiales-terapeuticos.firebaseapp.com",
    projectId: "materiales-terapeuticos",
    storageBucket: "materiales-terapeuticos.firebasestorage.app",
    messagingSenderId: "827133493876",
    appId: "1:827133493876:web:7d51b4befe64e0f8dfc721"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let patients = [];
let activePatientId = null;

const patientForm = document.getElementById('patient-form');
const patientsListEl = document.getElementById('patients-list');
const noPatientSelected = document.getElementById('no-patient-selected');
const patientDetail = document.getElementById('patient-detail');
const documentForm = document.getElementById('document-form');
const searchInput = document.getElementById('search-patient');

async function loadPatientsFromCloud() {
    try {
        const querySnapshot = await getDocs(collection(db, "patients"));
        patients = [];
        querySnapshot.forEach((docSnap) => {
            patients.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        renderPatients();
    } catch (error) {
        console.error("Error al cargar pacientes: ", error);
    }
}

patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPatientData = {
        name: document.getElementById('patient-name').value.trim(),
        phone: document.getElementById('patient-phone').value.trim(),
        motivo: document.getElementById('patient-motivo').value.trim(),
        documents: []
    };

    try {
        const docRef = await addDoc(collection(db, "patients"), newPatientData);
        newPatientData.id = docRef.id;
        patients.push(newPatientData);
        patientForm.reset();
        renderPatients();
        alert('¡Paciente registrado con éxito en la nube!');
    } catch (error) {
        console.error("Error al guardar paciente: ", error);
    }
});

function renderPatients(filter = '') {
    patientsListEl.innerHTML = '';
    const filtered = patients.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
        patientsListEl.innerHTML = '<p style="font-size: 0.85rem; color: #64748b; text-align:center; padding: 10px;">No hay pacientes.</p>';
        return;
    }

    filtered.forEach(patient => {
        const div = document.createElement('div');
        div.className = `patient-item ${patient.id === activePatientId ? 'active' : ''}`;
        div.innerHTML = `
            <strong>${patient.name}</strong>
            <p style="font-size: 0.8rem; color: #64748b;">${patient.motivo || 'Sin motivo'}</p>
        `;
        div.onclick = () => selectPatient(patient.id);
        patientsListEl.appendChild(div);
    });
}

searchInput.addEventListener('input', (e) => {
    renderPatients(e.target.value);
});

function selectPatient(id) {
    activePatientId = id;
    renderPatients(searchInput.value);
    
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    noPatientSelected.classList.add('hidden');
    patientDetail.classList.remove('hidden');

    document.getElementById('detail-name').innerText = patient.name;
    document.getElementById('detail-phone').innerText = `Tel: ${patient.phone}`;
    document.getElementById('detail-motivo').innerText = patient.motivo;

    const waBtn = document.getElementById('whatsapp-direct-btn');
    const waMsg = encodeURIComponent(`Hola ${patient.name}, te escribo desde la Clínica de la Convergencia.`);
    waBtn.href = `https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}?text=${waMsg}`;

    renderDocuments(patient);
}

documentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activePatientId) return;

    const title = document.getElementById('doc-title').value.trim();
    const url = document.getElementById('doc-url').value.trim();
    const patient = patients.find(p => p.id === activePatientId);
    
    const newDoc = {
        id: Date.now().toString(),
        title,
        url,
        date: new Date().toLocaleDateString(),
        notes: ''
    };

    patient.documents.push(newDoc);

    try {
        const patientRef = doc(db, "patients", activePatientId);
        await updateDoc(patientRef, { documents: patient.documents });
        documentForm.reset();
        renderDocuments(patient);
    } catch (error) {
        console.error("Error al guardar documento: ", error);
    }
});

function renderDocuments(patient) {
    const container = document.getElementById('documents-container');
    container.innerHTML = '';

    if (!patient.documents || patient.documents.length === 0) {
        container.innerHTML = '<p style="font-size: 0.9rem; color: #64748b; text-align: center; padding: 20px;">No hay documentos.</p>';
        return;
    }

    patient.documents.forEach(docItem => {
        const docDiv = document.createElement('div');
        docDiv.className = 'doc-card';
        docDiv.innerHTML = `
            <div class="doc-info">
                <div>
                    <strong>${docItem.title}</strong>
                    <span style="font-size: 0.75rem; color: #64748b; display: block;">Fecha: ${docItem.date}</span>
                </div>
                <div>
                    <a href="${docItem.url}" target="_blank" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;"><i class="fa-solid fa-eye"></i> Ver</a>
                    <button onclick="deleteDocItem('${docItem.id}')" class="btn" style="background: #ef4444; color: white; padding: 5px 10px; font-size: 0.8rem; margin-left: 5px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="notes-section">
                <label style="font-size: 0.75rem; color: #475569;"><i class="fa-solid fa-pen-to-square"></i> Observaciones:</label>
                <textarea rows="2" oninput="updateNotes('${docItem.id}', this.value)">${docItem.notes || ''}</textarea>
            </div>
        `;
        container.appendChild(docDiv);
    });
}

window.updateNotes = async function(docId, text) {
    const patient = patients.find(p => p.id === activePatientId);
    const docItem = patient.documents.find(d => d.id === docId);
    if (docItem) {
        docItem.notes = text;
        try {
            await updateDoc(doc(db, "patients", activePatientId), { documents: patient.documents });
        } catch (error) {
            console.error("Error al actualizar notas:", error);
        }
    }
};

window.deleteDocItem = async function(docId) {
    if (!confirm('¿Eliminar documento?')) return;
    const patient = patients.find(p => p.id === activePatientId);
    patient.documents = patient.documents.filter(d => d.id !== docId);
    try {
        await updateDoc(doc(db, "patients", activePatientId), { documents: patient.documents });
        renderDocuments(patient);
    } catch (error) {
        console.error("Error al eliminar documento:", error);
    }
};

loadPatientsFromCloud();
