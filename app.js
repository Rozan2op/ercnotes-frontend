// --- 1. CONFIGURATION ---
const API_URL = "https://benotes-backend.onrender.com";

// --- 2. DOM ELEMENTS ---
const facultyGrid = document.getElementById('faculty-grid');
const semesterSection = document.getElementById('semester-section');
const facultySection = document.getElementById('faculty-section');
const subjectList = document.getElementById('subject-list');
const semesterList = document.getElementById('semester-list');
const modal = document.getElementById('uploadModal');
const successModal = document.getElementById('successModal');
const selectedFacultyTitle = document.getElementById('selected-faculty-title');

let currentFaculty = '';
let currentSemester = '';

// --- 3. NAVIGATION ---
function renderFaculties() {
    facultyGrid.innerHTML = '';
    for (const [key, data] of Object.entries(engineeringData)) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<i class="fas ${data.icon}"></i><h3>${data.name}</h3>`;
        card.onclick = () => loadFaculty(key);
        facultyGrid.appendChild(card);
    }
}

function loadFaculty(key) {
    currentFaculty = key;
    facultySection.classList.add('hidden');
    semesterSection.classList.remove('hidden');
    selectedFacultyTitle.innerText = engineeringData[key].name;
    
    semesterList.innerHTML = '';
    for(let i=1; i<=8; i++) {
        const btn = document.createElement('button');
        btn.className = 'sem-btn';
        btn.innerText = `Semester ${i}`;
        btn.onclick = (e) => loadSubjects(i, e.target);
        semesterList.appendChild(btn);
    }
    loadSubjects(1, semesterList.firstChild);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetView() {
    facultySection.classList.remove('hidden');
    semesterSection.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 4. SUBJECT RENDERING ---
function loadSubjects(sem, btnElement) {
    currentSemester = sem;
    document.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    const subjects = engineeringData[currentFaculty].semesters[sem];
    subjectList.innerHTML = '';

    if(!subjects) {
        subjectList.innerHTML = '<p style="text-align:center; color:#94a3b8; margin-top:20px;">No subjects listed.</p>';
        return;
    }

    subjects.forEach(sub => {
        if (typeof sub === 'object' && sub.type === 'elective') {
            createElectiveDropdown(sub);
        } else {
            createSubjectRow(sub);
        }
    });
}

function createSubjectRow(name) {
    const div = document.createElement('div');
    div.className = 'subject-item';
    const containerId = `res-${name.replace(/[^a-zA-Z0-9]/g, '')}`;

    const header = document.createElement('div');
    header.className = 'subject-header';
    header.innerHTML = `<span>${name}</span> <i class="fas fa-chevron-down"></i>`;

    const content = document.createElement('div');
    content.className = 'subject-content';
    content.id = containerId;
    
    header.onclick = () => {
        const isOpen = content.classList.toggle('open');
        header.querySelector('i').className = isOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        if(isOpen && !content.hasAttribute('data-loaded')) {
            fetchNotes(name, containerId);
        }
    };

    div.appendChild(header);
    div.appendChild(content);
    subjectList.appendChild(div);
}

function createElectiveDropdown(electiveObj) {
    const container = document.createElement('div');
    container.className = 'elective-container';
    const header = document.createElement('div');
    header.className = 'elective-header';
    header.innerHTML = `<span><i class="fas fa-layer-group"></i> ${electiveObj.name}</span> <i class="fas fa-chevron-down"></i>`;
    const list = document.createElement('div');
    list.className = 'elective-list';

    header.onclick = () => {
        list.classList.toggle('show');
        header.querySelector('.fa-chevron-down')?.classList.toggle('fa-rotate-180');
    };

    electiveObj.subjects.forEach(subName => {
        const subDiv = document.createElement('div');
        subDiv.className = 'subject-item';
        const containerId = `res-${subName.replace(/[^a-zA-Z0-9]/g, '')}`;
        const subHeader = document.createElement('div');
        subHeader.className = 'subject-header';
        subHeader.innerHTML = `<span>${subName}</span> <i class="fas fa-chevron-down"></i>`;
        const subContent = document.createElement('div');
        subContent.className = 'subject-content';
        subContent.id = containerId;

        subHeader.onclick = () => {
            const isOpen = subContent.classList.toggle('open');
            subHeader.querySelector('i').className = isOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            if(isOpen && !subContent.hasAttribute('data-loaded')) fetchNotes(subName, containerId);
        };

        subDiv.appendChild(subHeader);
        subDiv.appendChild(subContent);
        list.appendChild(subDiv);
    });
    container.appendChild(header);
    container.appendChild(list);
    subjectList.appendChild(container);
}

// --- 5. API FETCHING ---
async function fetchNotes(subjectName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div style="padding:20px; color:#94a3b8; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        // FIXED URL PATH (/api/notes)
        const url = `${API_URL}/api/notes?faculty=${currentFaculty}&semester=${currentSemester}&subject=${encodeURIComponent(subjectName)}`;
        const response = await fetch(url);
        const notes = await response.json();
        
        container.innerHTML = ''; 
        container.setAttribute('data-loaded', 'true');

        if(!notes || notes.length === 0) {
            container.innerHTML = '<div style="padding:20px; color:#94a3b8; text-align:center;">No resources uploaded yet.</div>';
            return;
        }

        const groups = { 'Syllabus': [], 'Text Book': [], 'Notes': [], 'Manual': [], 'Lab Report': [], 'Assignment': [], 'Question': [] };
        notes.forEach(note => {
            if(groups[note.type]) groups[note.type].push(note);
            else groups['Notes'].push(note);
        });

        for (const [type, typeNotes] of Object.entries(groups)) {
            if (typeNotes.length > 0) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'resource-category';
                groupDiv.innerHTML = `<span class="category-label">${type}</span>`;
                const listDiv = document.createElement('div');
                listDiv.className = 'resource-list';

                typeNotes.forEach(note => {
                    const link = document.createElement('a');
                    link.href = note.link;
                    link.target = "_blank";
                    link.className = "resource-link";
                    link.innerHTML = `${getIcon(note.type)} ${note.originalName || "View PDF"}`;
                    listDiv.appendChild(link);
                });
                groupDiv.appendChild(listDiv);
                container.appendChild(groupDiv);
            }
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div style="padding:20px; color:#ef4444; text-align:center;">Failed to load resources.</div>'; 
    }
}

function getIcon(type) {
    const icons = { 'Notes': 'fa-file-pdf', 'Syllabus': 'fa-list-alt', 'Question': 'fa-question-circle', 'Manual': 'fa-cogs', 'Lab Report': 'fa-flask', 'Assignment': 'fa-pen-fancy', 'Text Book': 'fa-book' };
    return `<i class="fas ${icons[type] || 'fa-link'}"></i>`;
}

// --- 6. MODAL LOGIC ---
function openGlobalModal() {
    modal.style.display = 'block';
    const facultySelect = document.getElementById('modalFaculty');
    facultySelect.innerHTML = '<option value="">-- Select Faculty --</option>';
    for (const [key, data] of Object.entries(engineeringData)) {
        const option = document.createElement('option');
        option.value = key; option.innerText = data.name;
        facultySelect.appendChild(option);
    }
}

function modalFacultyChanged() {
    const facultyKey = document.getElementById('modalFaculty').value;
    const semSelect = document.getElementById('modalSemester');
    semSelect.innerHTML = '<option value="">-- Select Semester --</option>';
    semSelect.disabled = !facultyKey;
    if(facultyKey) {
        for(let i=1; i<=8; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = `Semester ${i}`;
            semSelect.appendChild(opt);
        }
    }
}

function modalSemesterChanged() {
    const facultyKey = document.getElementById('modalFaculty').value;
    const semKey = document.getElementById('modalSemester').value;
    const subjectSelect = document.getElementById('modalSubject');
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    subjectSelect.disabled = !semKey;

    if (facultyKey && semKey) {
        const subjects = engineeringData[facultyKey].semesters[semKey];
        subjects.forEach(sub => {
            if (typeof sub === 'object' && sub.type === 'elective') {
                sub.subjects.forEach(elec => {
                    const opt = document.createElement('option');
                    opt.value = elec; opt.innerText = `${elec} (Elective)`;
                    subjectSelect.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.value = sub; opt.innerText = sub;
                subjectSelect.appendChild(opt);
            }
        });
    }
}

function updateFileName() {
    const input = document.getElementById('fileInput');
    const display = document.getElementById('fileNameDisplay');
    const label = document.getElementById('fileLabelText');
    if(input.files.length > 0) {
        display.innerText = input.files[0].name;
        label.innerText = "File Selected:";
        label.style.color = "#6366f1";
    }
}

function closeModal() { modal.style.display = 'none'; }
function closeSuccessModal() { successModal.style.display = 'none'; }

window.onclick = (event) => {
    if (event.target == modal) closeModal();
    if (event.target == successModal) closeSuccessModal();
};

// --- 7. FORM SUBMIT ---
document.getElementById('uploadForm').onsubmit = async function(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('faculty', document.getElementById('modalFaculty').value);
    formData.append('semester', document.getElementById('modalSemester').value);
    formData.append('subject', document.getElementById('modalSubject').value);
    formData.append('type', document.getElementById('resourceType').value);
    formData.append('uploader', document.getElementById('uploaderName').value);
    
    const fileInput = document.getElementById('fileInput');
    if(fileInput.files.length > 0) formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        if(response.ok) {
            closeModal();
            successModal.style.display = 'block';
            e.target.reset();
            document.getElementById('fileNameDisplay').innerText = "";
        } else {
            alert("❌ Server Error. Please try again.");
        }
    } catch (error) {
        alert("❌ Could not connect to server.");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
};

renderFaculties();