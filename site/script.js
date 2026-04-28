// --- THE GLOBAL TUI ENGINE ---

window.playTuiSound = function (type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "click") {
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }
  } catch (e) {
    /* Browser blocked audio or not supported */
  }
};

window.openModal = function (rawUrl) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");

  if (modal && modalImg) {
    modalImg.src = rawUrl;
    modal.style.display = "flex";
    if (window.playTuiSound) window.playTuiSound("click");
  }
};

window.closeModal = function () {
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("modalImg").src = "";
  }
};

window.loadModule = async function (moduleName) {
  // 1. Force find the elements every single time
  const viewscreen = document.getElementById("module-viewscreen");
  const commandLabel = document.getElementById("command-label");

  if (!commandLabel) {
    console.warn(
      "COMMAND_LABEL_NOT_FOUND: Check if <div id='command-label'> exists in index.html",
    );
  }

  // Path Logic
  const filePath = moduleName.replace("_", "/");
  const fileName = filePath.split("/").pop();

  // Update the Prompt (Forcing the innerHTML)
  if (commandLabel) {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Shorter Mobile Version: $~ cat file.log
      commandLabel.innerHTML = `<span class="prompt">$~</span> cat ${fileName}.log`;
    } else {
      // Full Desktop Version: root@nottyton:~$ cat /root/projects/modules/path/file.log
      const displayPath = `/root/projects/modules/${filePath}.log`;
      commandLabel.innerHTML = `<span class="prompt">root@nottyton:~$</span> cat ${displayPath}`;
    }

    console.log("PROMPT_MODE:", isMobile ? "MOBILE" : "DESKTOP");
  }

  // Fetch Content
  try {
    const response = await fetch(`./modules/${filePath}.html`);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const text = await response.text();

    if (viewscreen) {
      viewscreen.classList.add("glitch-active");
      viewscreen.innerHTML = text;

      // Contact Form Handler
      if (moduleName === "system_comms") {
        const sendBtn = document.getElementById("send-btn");
        const statusEl = document.getElementById("transmission-status");

        sendBtn?.addEventListener("click", async () => {
          const alias = document.getElementById("comms-alias").value;
          const topic = document.getElementById("comms-topic").value;
          const message = document.getElementById("comms-message").value;

          if (!alias || !message) {
            statusEl.innerText = "[ERROR]: ALIAS_AND_MESSAGE_REQUIRED";
            statusEl.classList.remove("hidden");
            return;
          }

          sendBtn.disabled = true;
          sendBtn.innerText = "SENDING...";
          statusEl.innerText = "> UPLOADING_PACKET...";
          statusEl.classList.remove("hidden");

          const success = await sendNtfyMsg(alias, message, topic);

          if (success) {
            statusEl.innerHTML =
              "> <span style='color:var(--phosphor-bright)'>TRANSMISSION_SUCCESSFUL.</span>";
            sendBtn.innerText = "DONE";
          } else {
            statusEl.innerHTML =
              "> <span style='color:var(--phosphor-muted)'>TRANSMISSION_FAILED.</span>";
            sendBtn.disabled = false;
            sendBtn.innerText = "RETRY_EXECUTION";
          }
        });
      }

      // Restart typing animation
      viewscreen.classList.remove("typing-animation");
      void viewscreen.offsetWidth;
      viewscreen.classList.add("typing-animation");

      setTimeout(() => viewscreen.classList.remove("glitch-active"), 200);
    }
  } catch (err) {
    console.error("LOAD_ERR:", err);
  }
};

// --- CONTACT FORM BACKEND ---
const sendNtfyMsg = async (alias, message, selectedTopic = "nottyxton-gen") => {
  const WORKER_URL = "https://nottyxton-contact.btlsexton.workers.dev";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: selectedTopic,
        title: `INQUIRY FROM: ${alias}`,
        message: message,
        tags: "nottyxton,general",
      }),
    });

    if (response.ok) {
      console.log("Transmission Successful.");
      return response.ok;
    } else {
      console.error("Transmission Intercepted (Error).");
      return false;
    }
  } catch (err) {
    console.error("Connection Failed:", err);
    return false;
  }
};

// Keyboard Functions - NAV
window.addEventListener("keydown", (e) => {
  // If the user is typing in a form field, don't trigger navigation
  const activeElement = document.activeElement;
  if (
    activeElement.tagName === "INPUT" ||
    activeElement.tagName === "TEXTAREA" ||
    activeElement.isContentEditable
  ) {
    return; // Exit early and let the user type
  }
  const fKeyMap = {
    F1: "system_audit",
    F2: "infra_index",
    F3: "auto_index",
    F4: "lab_index",
    F5: "net_index",
    F9: "RESUME_REDIRECT", // Not a module
  };

  if (fKeyMap[e.key]) {
    // Prevent default browser behavior (like opening Help or refreshing)
    e.preventDefault();

    if (e.key === "F9") {
      e.preventDefault();
      window.loadModule("system_resources");

      document
        .querySelectorAll(".nav-item")
        .forEach((n) => n.classList.remove("active"));
      document
        .querySelector('[data-module="system_resources"]')
        .classList.add("active");
    } else {
      window.loadModule(fKeyMap[e.key]);

      // Visual Feedback: Update the 'active' class on the buttons
      document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-module") === fKeyMap[e.key]) {
          btn.classList.add("active");
        }
      });
    }

    // Audio Feedback: Indicate button press with audio que
    if (window.playTuiSound) window.playTuiSound("click");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const mainContent = document.getElementById("main-content");
  let bootTimeouts = [];

  // --- BOOT LOGIC ---
  function startBoot() {
    const bootLines = [
      { t: "NOTTYXTON BIOS v 2.0.1 (C) 2026", d: 0 },
      { t: "CPU: Intel(R) Xeon(R) Gold - 16 Cores @ 3.2GHz", d: 100 },
      { t: "MEM: 128GB ECC REGISTERED DDR4... OK", d: 200 },
      { t: "STORAGE: ZFS-POOL-01 [ONLINE]", d: 300 },
      { t: "------------------------------------------------", d: 350 },
      { t: "LOADING KERNEL MODULES...", d: 450 },
      { t: "[ OK ] kvm_intel", d: 500 },
      { t: "[ OK ] zfs_arc", d: 550 },
      { t: "[ OK ] vfio_pci", d: 600 },
      { t: "STARTING NETWORK UPLINK: eth0 -> br0", d: 800 },
      { t: "INIT PROXMOX_VE_CORE...", d: 1000 },
      { t: "PROGRESS: [##########----------] 50%", d: 1300 },
      { t: "PROGRESS: [####################] 100%", d: 1600 },
      { t: "MOUNTING /root/projects/...", d: 1800 },
      { t: "ESTABLISHING SSH_TUNNEL TO HOU_NODE...", d: 2100 },
      { t: "SYSTEM READY. HANDING OVER TO TUI_INTERFACE.", d: 2500 },
    ];

    // Add the skip hint immediately
    const hint = document.createElement("p");
    hint.className = "skip-hint";
    hint.textContent = ">> PRESS ANY KEY OR CLICK TO SKIP BOOT_SEQUENCE";
    loadingScreen.appendChild(hint);

    bootLines.forEach((line) => {
      let t = setTimeout(() => {
        const p = document.createElement("p");
        // Colorize the [ OK ] tags
        p.innerHTML = line.t.replace(
          "[ OK ]",
          "<span style='color:#00ff00'>[ OK ]</span>",
        );
        loadingScreen.insertBefore(p, hint); // Keep hint at the bottom
        loadingScreen.scrollTop = loadingScreen.scrollHeight;

        if (line.t.includes("SYSTEM READY")) {
          setTimeout(finishBoot, 800);
        }
      }, line.d);
      bootTimeouts.push(t);
    });

    window.addEventListener("keydown", skipBoot, { once: true });
    window.addEventListener("click", skipBoot, { once: true });
  }

  function skipBoot() {
    bootTimeouts.forEach(clearTimeout);
    finishBoot();
  }

  function finishBoot() {
    const loadingScreen = document.getElementById("loading-screen");
    const mainContent = document.getElementById("main-content");

    if (loadingScreen) loadingScreen.style.display = "none";

    if (mainContent) {
      mainContent.style.display = "block";
      mainContent.classList.add("power-on-anim");
    }

    // Only load the audit module if the viewscreen is currently empty.
    // This prevents the reload bug when typing or re-focusing that's been
    // plaguing me for the past 2-3 months.
    const viewscreen = document.getElementById("module-viewscreen");
    if (viewscreen && viewscreen.innerHTML.trim() === "") {
      window.loadModule("system_audit");

      const f1 = document.querySelector('[data-module="system_audit"]');
      if (f1) f1.classList.add("active");
    }
  }

  /* SYSTOHC */
  function updateClocks() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Target all elements with the class 'sys-clock'
    const clocks = document.querySelectorAll(".sys-clock");

    clocks.forEach((clock) => {
      clock.textContent = timeString;
    });
  }

  // Run every second
  setInterval(updateClocks, 1000);
  updateClocks(); // Initial call

  // --- THE CLICK LISTENER ---
  document.addEventListener("click", (e) => {
    if (e.target.closest(".dither-link")) {
      window.playTuiSound("click");
      return;
    }

    const item = e.target.closest(".nav-item, .file-link, .hub-window");
    if (!item) return;

    const mod = item.getAttribute("data-module");

    if (mod === "system_resume") {
      e.preventDefault();
      e.stopPropagation();
      window.open("./assets/tSexton_Resume.pdf", "_blank");
      return;
    }

    if (mod === "system_source") {
      e.preventDefault();
      e.stopPropagation();
      window.open("https://www.github.com/Tyxton", "_blank");
      return;
    }

    if (mod) {
      e.preventDefault();
      e.stopPropagation();

      // Only update the active state for the top nav keys //
      if (item.classList.contains("nav-item")) {
        document
          .querySelectorAll(".nav-item")
          .forEach((n) => n.classList.remove("active"));
        item.classList.add("active");
      }
      window.loadModule(mod);
    }
  });

  // --- COLLAPSIBLE LOGIC ---
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".collapsible-header");
    if (!header) return;

    const container = header.parentElement;
    const content = container.querySelector(".collapsible-content");
    const icon = header.querySelector(".toggle-icon");

    if (
      (content && content.style.display === "none") ||
      content.style.display === ""
    ) {
      content.style.display = "block";
      icon.innerText = "[-] ";
      content.classList.add("flicker-in");
    } else {
      content.style.display = "none";
      icon.innerText = "[+] ";
      content.classList.remove("flicker-in");
    }

    if (window.playTuiSound) window.playTuiSound("click");
  });

  document.addEventListener("mouseover", (e) => {
    const window = e.target.closest(".hub-window");
    const desc = document.getElementById("resource-desc");
    if (!window || !desc) return;

    const type = window.getAttribute("data-module");
    if (type === "resume_view")
      desc.innerText = "ACCESS PROFESSIONAL HISTORY AND CREDENTIALS.";
    if (type === "comms_view")
      desc.innerText = "ESTABLISH DIRECT UPLINK TO OPERATOR.";
    if (type === "source_view")
      desc.innerText = "BROWSE EXTERNAL CODE REPOSITORIES.";
  });

  startBoot();
  setInterval(updateClocks, 1000);
  updateClocks();
});
