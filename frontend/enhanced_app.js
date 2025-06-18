window.addEventListener('DOMContentLoaded', function () {
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const stepList = document.getElementById('stepList');
  const flowchart = document.getElementById('flowchart');
  const qaSidebar = document.getElementById('qaSidebar');
  const qaToggleBtn = document.getElementById('qaToggleBtn');
  const qaForm = document.getElementById('qaForm');
  const qaInput = document.getElementById('qaInput');
  const qaChatBox = document.getElementById('qaChatBox');

  let currentSteps = [];

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('pdf');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadStatus.innerText = 'Uploading...';
    stepList.innerHTML = '';
    flowchart.innerText = 'Loading...';

    try {
      const response = await fetch('http://127.0.0.1:8000/upload/', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      currentSteps = data.steps;

      if (currentSteps.length === 0) {
        uploadStatus.innerText = 'No steps extracted.';
        flowchart.innerText = '';
        return;
      }

      uploadStatus.innerText = '';
      renderStepCards(currentSteps);
      renderFlowchart(currentSteps);
      renderChart(currentSteps);

    } catch (err) {
      console.error('Upload failed:', err);
      uploadStatus.innerText = 'Something went wrong while uploading the PDF.';
    }
  });

  function renderStepCards(steps) {
    stepList.innerHTML = '';
    steps.forEach((step, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerText = `${index + 1}. ${step}`;
      stepList.appendChild(li);
    });
  }

 async function renderFlowchart(steps) {
  const flowchart = document.getElementById('flowchart');
  if (!window.mermaidRender || !flowchart) return;

  const cleanedSteps = steps
    .map(s => s.replace(/["']/g, '').trim())
    .filter(s => s.length > 10);

  if (cleanedSteps.length < 2) {
    flowchart.innerHTML = '<p class="text-danger">Not enough steps to render flowchart.</p>';
    return;
  }

  const graphDef = ['graph TD'];
  cleanedSteps.forEach((step, i) => {
    const id = `S${i}`;
    const label = step.replace(/["]/g, '\\"');
    if (i === 0) {
      graphDef.push(`${id}["${label}"]`);
    } else {
      graphDef.push(`S${i - 1} --> ${id}["${label}"]`);
    }
  });
  console.log("Mermaid input:");
  console.log(graphDef.join('\n'));


  try {
    const { svg } = await window.mermaidRender.render('sopFlowchart', graphDef.join('\n'));
    flowchart.innerHTML = svg;
  } catch (err) {
    console.error("Mermaid rendering error:", err);
    flowchart.innerHTML = '<p class="text-danger">Error rendering flowchart.</p>';
  }
}



  function renderChart(steps) {
    const ctx = document.getElementById('stepBarChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: steps.map((_, i) => `Step ${i + 1}`),
        datasets: [{
          label: 'Step Length',
          data: steps.map(step => step.length),
          backgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Q&A Toggle
  qaToggleBtn.addEventListener('click', () => {
    const isOpen = qaSidebar.style.transform === 'translateX(0%)';
    qaSidebar.style.transform = isOpen ? 'translateX(100%)' : 'translateX(0%)';
  });

  // Q&A Handler
  qaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = qaInput.value.trim();
    if (!question) return;

    const userMsg = document.createElement('div');
    userMsg.innerHTML = `<strong>You:</strong> ${question}`;
    qaChatBox.appendChild(userMsg);

    try {
      const res = await fetch('http://127.0.0.1:8000/ask/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: currentSteps.join('\n'), use_web: true })
      });
      const data = await res.json();
      const botMsg = document.createElement('div');
      botMsg.innerHTML = `<strong>Bot:</strong> ${data.answer}`;
      qaChatBox.appendChild(botMsg);
    } catch (err) {
      const errorMsg = document.createElement('div');
      errorMsg.innerHTML = `<strong>Error:</strong> Could not get an answer.`;
      qaChatBox.appendChild(errorMsg);
    }

    qaInput.value = '';
    qaChatBox.scrollTop = qaChatBox.scrollHeight;
  });
});
