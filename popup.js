const toggleListen = document.getElementById('toggleListen');
const toggleRead = document.getElementById('toggleRead');
const toggleStartPhrase = document.getElementById('toggleStartPhrase');
const startPhraseText = document.getElementById('startPhraseText');
const voiceSelect = document.getElementById('voiceSelect');

const startPhraseLabel = document.getElementById('startPhraseLabel');
const voiceSelectLabel = document.getElementById('voiceSelectLabel');

function updateToggle(element, value) {
    element.checked = value;

    if (element.id === 'toggleStartPhrase') {
        if (value) {
            startPhraseLabel.style.display = 'block';
        } else {
            startPhraseLabel.style.display = 'none';
        }
    } else if (element.id === 'toggleRead') {
        if (value) {
            voiceSelectLabel.style.display = 'block';
        } else {
            voiceSelectLabel.style.display = 'none';
        }
    }
}

function updateText(element, value) {
    element.value = value;
}

function updateSelect(element, value) {
    element.value = value;
}

function setStorage(key, value) {
    chrome.storage.sync.set({ [key]: value }, () => {
        console.log('User preferences saved');
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { command: 'updatePreference', toggleId: key, value: value });
    })
}

function toggleClick(toggleId) {
    const toggle = document.getElementById(toggleId);
    const newValue = toggle.checked;
    updateToggle(toggle, newValue);

    setStorage(toggleId, newValue);
}

function textChange(elementId) {
    const element = document.getElementById(elementId);
    const newValue = element.value || '';
    updateText(element, newValue);

    setStorage(elementId, newValue);
}

function voiceSelectionChanged() {
    const voiceSelect = document.getElementById('voiceSelect');
    const selectedVoiceURI = voiceSelect.value;

    setStorage('voiceSelect', selectedVoiceURI);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleListen.addEventListener('click', () => toggleClick(toggleListen.id));
    toggleRead.addEventListener('click', () => toggleClick(toggleRead.id));
    toggleStartPhrase.addEventListener('click', () => toggleClick(toggleStartPhrase.id));
    startPhraseText.addEventListener('change', () => textChange(startPhraseText.id));
    voiceSelect.addEventListener('change', voiceSelectionChanged);
});

function populateVoiceList(voices) {
    const voiceSelect = document.getElementById('voiceSelect');
    const englishVoices = voices.filter((voice) => voice.lang.startsWith('en'));

    englishVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = voice.name;
        option.value = voice.voiceURI;
        voiceSelect.appendChild(option);
    });
}

function updateVoiceList() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
        populateVoiceList(voices);
    } else {
        setTimeout(updateVoiceList, 100);
    }
}

updateVoiceList();

function tryToSetValue(selectElement, value, retryInterval=100) {
    const optionExists = Array.from(selectElement.options).some((option) => option.value === value);

    if (optionExists) {
        selectElement.value = value;
        console.log('Value set successfully');
    } else {
        setTimeout(() => {
            tryToSetValue(selectElement, value, retryInterval);
        }, retryInterval);
    }
}

// Load user preferences
chrome.storage.sync.get(['toggleListen', 'toggleRead', 'toggleStartPhrase', 'startPhraseText', 'voiceSelect'], (result) => {
    console.log(result);
    updateToggle(toggleListen, result.toggleListen || false);
    updateToggle(toggleRead, result.toggleRead || false);
    updateToggle(toggleStartPhrase, result.toggleStartPhrase || false);
    updateText(startPhraseText, result.startPhraseText || '');
    
    console.log(result);
    tryToSetValue(voiceSelect, result.voiceSelect);
});