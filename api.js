const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");

let notes = [];

// Reusable request function for GET, POST and DELETE.
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const data = await response.json();

    return { data, status: response.status };
}

// Display notes safely using textContent.
function renderNotes(noteArray) {
    notesList.replaceChildren();

    if (noteArray.length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.textContent = "No notes to display.";
        notesList.appendChild(emptyMessage);
        return;
    }

    noteArray.forEach(function(note) {
        const item = document.createElement("li");

        const title = document.createElement("h3");
        title.textContent = note.title;

        const body = document.createElement("p");
        body.textContent = note.body || "No body provided.";

        item.append(title, body);
        notesList.appendChild(item);
    });
}

// Task 1: Load 10 notes using GET.
async function loadNotes() {
    loadButton.disabled = true;
    statusMessage.textContent = "Loading notes...";
    statusMessage.className = "status-loading";

    try {
        const result = await request(`${API_URL}?_limit=10`);

        notes = result.data;
        renderNotes(notes);

        statusMessage.textContent = notes.length === 0
            ? "No notes were returned by the server."
            : `Loaded ${notes.length} notes from the server.`;

        statusMessage.className = "status-success";
    } catch (error) {
        notes = [];
        renderNotes(notes);

        statusMessage.textContent =
            "Sorry, we couldn't load your notes. Please try again.";
        statusMessage.className = "status-error";

        console.error("Failed to load notes:", error);
    } finally {
        loadButton.disabled = false;
    }
}

// Task 2: Create a note using POST.
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    // Validate the title before making an API request.
    if (!title) {
        statusMessage.textContent = "Please enter a title.";
        statusMessage.className = "status-error";
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        statusMessage.textContent =
            "The title must be 100 characters or fewer.";
        statusMessage.className = "status-error";
        titleInput.focus();
        return;
    }

    submitButton.disabled = true;
    statusMessage.textContent = "Creating note...";
    statusMessage.className = "status-loading";

    try {
        const result = await request(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                body: body,
                userId: 1
            })
        });

        const newNote = result.data;

        // JSONPlaceholder simulates creation but does not persist posts.
        // Keep the returned note in this browser's current in-memory list.
        notes.unshift(newNote);
        renderNotes(notes);

        statusMessage.textContent =
            `Note created (status ${result.status}, id ${newNote.id}).`;
        statusMessage.className = "status-success";

        noteForm.reset();
    } catch (error) {
        statusMessage.textContent =
            "Sorry, we couldn't create your note. Please try again.";
        statusMessage.className = "status-error";

        console.error("Failed to create note:", error);
    } finally {
        submitButton.disabled = false;
    }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);