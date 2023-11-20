function setup() {
  let idx = null;
  let currentInstruction = null;

  const $ = (i) => document.getElementById(i);
  const onclick = (elementId, fn) => $(elementId).addEventListener("click", fn);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "currentInstruction") {
      currentInstruction = message.data;
      loadInstructions();
    }
    if (message.type === "closePopup") {
      window.close();
    }
  });

  function getCustomInstruction() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs
        .sendMessage(tabs[0].id, {
          tab: tabs[0],
          type: "getInstruction",
        })
        .catch(console.error);
    });
  }

  function loadInstructions() {
    function currentMatches(instruction) {
      if (currentInstruction == null) {
        return (
          instruction.about_user_message == "" &&
          instruction.about_model_message == ""
        );
      }
      return (
        instruction.about_user_message ==
          currentInstruction.about_user_message &&
        instruction.about_model_message ==
          currentInstruction.about_model_message
      );
    }
    chrome.storage.local.get("instructions", (data) => {
      const instructions = data.instructions || [];
      $("instructions").innerHTML = instructions
        .map(
          (instruction, index) =>
            `<option value="${index}" ${
              currentMatches(instruction) ? "selected" : ""
            }>${instruction.name}</option>`
        )
        .join("");
      $("instruction-form").style.display = "none";
      idx = null;
      if (instructions.length == 0) {
        defaultInstructions.sort((a, b) => a.name.localeCompare(b.name));
        defaultInstructions.forEach((i) => instructions.push(i));
        chrome.storage.local.set({ instructions }, loadInstructions);
      }
    });
  }

  onclick("save-instruction", function () {
    const instruction = {
      name: $("name").value.trim(),
      about_user_message: $("know-about").value.trim(),
      about_model_message: $("about_model_message").value.trim(),
    };

    chrome.storage.local.get("instructions", (data) => {
      const instructions = data.instructions || [];
      if (idx !== null) {
        instructions[idx] = instruction;
      } else {
        instructions.push(instruction);
      }
      chrome.storage.local.set({ instructions }, loadInstructions);
      $("instructions-box").style.display = "block";
      $("new-instruction").style.display = "block";
      $("back-button").style.display = "none";
    });
  });

  onclick("edit-instruction", function () {
    $("back-button").style.display = "block";
    $("instructions-box").style.display = "none";
    $("new-instruction").style.display = "none";
    $("instruction-form").style.display = "block";
    idx = $("instructions").value;
    chrome.storage.local.get("instructions", (data) => {
      const instructions = data.instructions || [];
      const instruction = instructions[idx];
      if (instruction) {
        $("name").value = instruction.name;
        $("know-about").value = instruction.about_user_message;
        $("about_model_message").value = instruction.about_model_message;
      }
    });
  });

  onclick("delete-instruction", function () {
    const index = $("instructions").value;
    if (
      index !== null &&
      confirm(
        `Are you sure you want to delete the instruction "${
          $("instructions").options[$("instructions").selectedIndex].text
        }"?`
      )
    ) {
      chrome.storage.local.get("instructions", (data) => {
        const instructions = data.instructions || [];
        instructions.splice(index, 1);
        chrome.storage.local.set({ instructions }, loadInstructions);
      });
    }
  });

  onclick("new-instruction", function () {
    $("back-button").style.display = "block";
    $("instructions-box").style.display = "none";
    $("new-instruction-form").style.display = "block";
    $("instruction-form").style.display = "none";
    $("new-instruction").style.display = "none";
  });

  onclick("save-new-instruction", function () {
    const instruction = {
      name: $("new-name").value.trim(),
      about_user_message: $("new-know-about").value.trim(),
      about_model_message: $("new-about_model_message").value.trim(),
    };

    chrome.storage.local.get("instructions", (data) => {
      const instructions = data.instructions || [];
      instructions.push(instruction);
      chrome.storage.local.set({ instructions }, () => {
        loadInstructions();
        $("new-instruction-form").style.display = "none";
        $("instructions-box").style.display = "block";
        $("back-button").style.display = "none";
        $("new-instruction").style.display = "block";
      });
    });
  });

  onclick("apply-instruction", function () {
    const selectedIndex = $("instructions").value;
    chrome.storage.local.get("instructions", (data) => {
      const instructions = data.instructions || [];
      const selectedInstruction = instructions[selectedIndex];
      if (selectedInstruction) {
        console.log(
          "Applying Custom Instruction Set:",
          selectedInstruction.name
        );
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            tab: tabs[0],
            type: "applyInstruction",
            instructions: selectedInstruction,
          });
        });
      }
    });
  });

  onclick("back-button", function () {
    $("new-instruction-form").style.display = "none";
    $("instruction-form").style.display = "none";
    $("back-button").style.display = "none";
    $("instructions-box").style.display = "block";
    $("new-instruction").style.display = "block";
  });

  setTimeout(getCustomInstruction, 220);
}

document.addEventListener("DOMContentLoaded", setup);
