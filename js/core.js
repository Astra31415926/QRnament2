// === ГЕНЕРАТОР: Синий QR на БЕЛОМ фоне ===

document.getElementById("generateBtn").addEventListener("click", () => {
    const text = document.getElementById("textInput").value.trim();
    if (!text) {
        alert("Введите текст!");
        return;
    }

    const size = 300;
    // API генерирует ч/б код, мы его перекрасим
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=ffffff`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = qrUrl;

    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Если пиксель темный (черная часть QR) -> делаем его чисто СИНИМ
            if (r < 128 && g < 128 && b < 128) {
                data[i]     = 0;   // R
                data[i + 1] = 0;   // G
                data[i + 2] = 255; // B (Ярко-синий)
            } else {
                // Если пиксель светлый -> оставляем БЕЛЫМ
                data[i]     = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const resultDiv = document.getElementById("qrResult");
        resultDiv.innerHTML = '';
        const hiddenQR = document.createElement("img");
        hiddenQR.src = canvas.toDataURL("image/png");
        resultDiv.appendChild(hiddenQR);
    };
});

// === СКАНЕР: Превращает синий в черный для чтения ===

const scanBtn = document.getElementById("scanBtn");
const scannerOverlay = document.getElementById("scannerOverlay");
const video = document.getElementById("video");
const closeScanner = document.getElementById("closeScanner");
const scanResult = document.getElementById("scanResult");

let scanning = false;
let stream = null;

scanBtn.addEventListener("click", async () => {
    try {
        scannerOverlay.style.display = "flex";
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.play();
        scanning = true;
        requestAnimationFrame(scanFrame);
    } catch (err) { alert("Камера недоступна"); }
});

closeScanner.addEventListener("click", stopScanner);

function stopScanner() {
    scanning = false;
    scannerOverlay.style.display = "none";
    if (stream) stream.getTracks().forEach(t => t.stop());
}

function scanFrame() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Создаем ЧЕРНО-БЕЛУЮ копию для библиотеки
        const bwData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // ФИЛЬТР: Если синего МНОГО, а красного и зеленого МАЛО -> это наш QR (черный)
            // Иначе -> это фон (белый)
            const isBlue = (b > 100 && r < 150 && g < 150);
            const val = isBlue ? 0 : 255;

            bwData[i] = bwData[i+1] = bwData[i+2] = val;
            bwData[i+3] = 255;
        }

        const code = jsQR(bwData, canvas.width, canvas.height);
        if (code) {
            scanResult.innerHTML = "Найдено: " + code.data;
            stopScanner();
            return;
        }
    }
    requestAnimationFrame(scanFrame);
}