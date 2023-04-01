let recognition;
let speechCounter = 0;
let listening = false;

let preferences = {
  toggleListen: false,
  toggleRead: false,
  toggleStartPhrase: false,
  startPhraseText: '',
  voiceSelect: ''
};

let availableVoices = [];

function stopListening() {
  if (recognition && listening) {
    listening = false;
    recognition.stop();
  }
}

function startListening() {
  if (recognition && speechCounter === 0 && preferences.toggleListen && !listening) {
    listening = true;
    recognition.start();
  }
}

function updateAvailableVoices() {
  availableVoices = window.speechSynthesis.getVoices();
}

function setUtteranceVoice(utterance, voiceURI, callback) {
  // console.log('Setting utterance voice...');

  if (voiceURI) {
    const availableVoices = window.speechSynthesis.getVoices();
    // console.log('Available voices:', availableVoices);

    const selectedVoice = availableVoices.find((voice) => voice.voiceURI === voiceURI);

    if (selectedVoice) {
      // console.log('Selected voice:', selectedVoice);
      utterance.voice = selectedVoice;
      // callback();
    } else {
      console.log('Voice not found, waiting for voices to load...');
      // If the voice is not found, wait for voices to load and try again
      window.speechSynthesis.onvoiceschanged = () => {
        setUtteranceVoice(utterance, voiceURI, callback);
      };
    }
  } else {
    console.log('No voice URI provided, using default voice');
    // If no voice URI is provided, call the callback immediately
    // callback();
  }
}

function speak(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);

  // Increment the speech counter
  speechCounter++;

  // Pause recognition when speech starts
  stopListening();

  // Resume recognition when speech ends
  utterance.onend = () => {
    console.log('Utterance Complete');
    // Decrement the speech counter
    speechCounter--;
    listening = false;

    // Resume recognition only if there are no ongoing speeches
    startListening();
  };
  utterance.onerror = (event) => {
    console.error('SpeechSynthesisUtterance.onerror', event);
  };

  setUtteranceVoice(utterance, preferences.voiceSelect, () => {
  });
  console.log('saying:', text);
  synth.speak(utterance);
}

function observeDOM(callback) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            callback(node);
          }
        }
      } else if (mutation.type === 'characterData') {
        callback(mutation.target.parentElement);
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function hasAncestorWithClass(element, className) {
  while (element) {
    if (element.classList && element.classList.contains(className)) {
      return true;
    }
    element = element.parentElement;
  }
  return false;
}

const debounceMap = new Map();

function checkForClassAndRead(element) {
  if (preferences.toggleRead == false) {
    return;
  }

  if (element && (element.tagName === 'P') && hasAncestorWithClass(element, 'dark:bg-[#444654]')) {
    if (!debounceMap.has(element)) {
      debounceMap.set(element, debounce(() => {
        speak(element.textContent.trim());
        debounceMap.delete(element);
      }, 1000));
    }
    debounceMap.get(element)();
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error('Speech Recognition is not supported in this browser.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    let text = event.results[0][0].transcript;
    if (preferences.toggleStartPhrase && preferences.startPhraseText) {
      phrase = preferences.startPhraseText.toLocaleLowerCase().replace(/[^a-z]/g, '');
      if (!text.toLowerCase().startsWith(phrase)) {
        console.log('Start phrase not detected in ', text);
        stopListening();
        return;
      } else {
        text = text.slice(phrase.length);
        if (text === '') {
          console.log('Only start phrase detected. Returning')
          return;
        }
      }
    }

    console.log('You said:', text);
    const textarea = document.querySelector('textarea[placeholder="Send a message..."]');
    const button = document.querySelector('button.absolute.p-1');

    if (textarea) {
      textarea.value = text;
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      textarea.dispatchEvent(inputEvent);
    }

    if (button) {
      button.click();
    }
  };

  recognition.onend = () => {
    if (speechCounter === 0 && preferences.toggleListen) {
      listening = false;
      startListening();
    }
  };

  if (preferences.toggleListen) {
    startListening();
  }
}

function updatePreferences() {
  chrome.storage.sync.get(['toggleListen', 'toggleRead', 'toggleStartPhrase', 'startPhraseText', 'voiceSelect'], (result) => {
    console.log(result);
    preferences = result;
    if (preferences.toggleListen) {
      startListening();
    } else {
      stopListening();
    }
  });
}

updatePreferences();
startSpeechRecognition();
observeDOM((element) => {
  checkForClassAndRead(element);
});

updateAvailableVoices();
if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
  // window.speechSynthesis.onvoiceschanged = updateAvailableVoices;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request);
  if (request.command === 'updatePreference') {
    updatePreferences();
  }
});
