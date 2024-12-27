// script.js
const startQuizButton = document.getElementById('start-quiz');
const questionContainer = document.getElementById('question-container');
const questionElement = document.getElementById('question');
const optionsElement = document.getElementById('options');
const submitAnswerButton = document.getElementById('submit-answer');
const explanationElement = document.getElementById('explanation');
const logsElement = document.getElementById('logs');

let currentQuestion = 0;
let questions = [];

startQuizButton.addEventListener('click', async () => {
    logsElement.innerHTML = '';
    logsElement.innerHTML += 'Starting quiz...<br>';

    try {
        // Process the PDF two pages at a time to reduce API load
        const pdfUrl = 'https://drive.google.com/file/d/1xZc0Ro3bZcMNb17mJxCsE1FXYc4YXEM3/view?usp=drivesdk';
        const apiKey = 'AIzaSyDyVUvIOD46Gj1TGAZ_irQr9OWTnOeflig';
        const pdfResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${pdfUrl.split('/').pop()}/export?key=${apiKey}&mimeType=application/pdf`);
        logsElement.innerHTML += 'Fetched PDF...<br>';
        const pdfBlob = await pdfResponse.blob();
        logsElement.innerHTML += 'Converted PDF to blob...<br>';
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        logsElement.innerHTML += 'Converted blob to array buffer...<br>';

        // Extract questions, options, and explanations using the APIs mentioned
        const visionApiKey = 'AIzaSyDnEZ6sNwbxVVVeQoTpEL22fep39b4I0oc';
        const visionEndpoint = 'https://vision.googleapis.com/v1/images:annotate';
        const groqApiKey = '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';
        const groqApi = 'https://api.groq.com/openai/v1/chat/completions';

        for (let i = 0; i < pdfArrayBuffer.byteLength; i += 2 * 1024 * 1024) {
            logsElement.innerHTML += `Processing chunk ${i}...<br>`;
            const chunk = pdfArrayBuffer.slice(i, i + 2 * 1024 * 1024);
            const chunkBlob = new Blob([chunk], { type: 'application/pdf' });
            const chunkArrayBuffer = await chunkBlob.arrayBuffer();
            const chunkBase64 = await arrayBufferToBase64(chunkArrayBuffer);

            const visionRequest = {
                requests: [
                    {
                        image: {
                            content: chunkBase64,
                        },
                        features: [
                            {
                                type: 'TEXT_DETECTION',
                            },
                        ],
                    },
                ],
            };

            logsElement.innerHTML += 'Sending vision request...<br>';
            const visionResponse = await fetch(visionEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${visionApiKey}`,
                },
                body: JSON.stringify(visionRequest),
            });
            logsElement.innerHTML += 'Received vision response...<br>';
            const visionData = await visionResponse.json();
            const textAnnotations = visionData.responses[0].textAnnotations;

            for (const annotation of textAnnotations) {
                logsElement.innerHTML += 'Processing annotation...<br>';
                const text = annotation.description;
                const groqRequest = {
                    model: 'llama-3.3-70b-specdec',
                    prompt: text,
                    max_tokens: 2048,
                    temperature: 0.7,
                    stream: false,
                };

                logsElement.innerHTML += 'Sending groq request...<br>';
                const groqResponse = await fetch(groqApi, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqApiKey}`,
                    },
                    body: JSON.stringify(groqRequest),
                });
                logsElement.innerHTML += 'Received groq response...<br>';
                const groqData = await groqResponse.json();
                const question = groqData.choices[0].text;

                // Detect if a question is text-based or image-based
                const questionType = question.includes('image') ? 'image-based' : 'text-based';

                // Extract options and explanation
                const options = [];
                const explanation = '';

                // Add question to questions array
                questions.push({
                    question,
                    options,
                    explanation,
                    type: questionType,
                });
            }
        }

        // Display first question
        displayQuestion();
    } catch (error) {
        logsElement.innerHTML += `Error: ${error.message}<br>`;
    }
});

submitAnswerButton.addEventListener('click', () => {
    try {
        // Show correct answer with explanation
        const correctAnswer = questions[currentQuestion].options[0];
        explanationElement.textContent = `Correct answer: ${correctAnswer} - ${questions[currentQuestion].explanation}`;

        // Proceed to next question
        currentQuestion++;
        if (currentQuestion < questions.length) {
            displayQuestion();
        } else {
            questionContainer.style.display = 'none';
        }
    } catch (error) {
        logsElement.innerHTML += `Error: ${error.message}<br>`;
    }
});

function displayQuestion() {
    questionElement.textContent = questions[currentQuestion].question;
    optionsElement.innerHTML = '';
    for (const option of questions[currentQuestion].options) {
        const optionElement = document.createElement('li');
        optionElement.textContent = option;
        optionsElement.appendChild(optionElement);
    }
    questionContainer.style.display = 'block';
}

function arrayBufferToBase64(arrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}
