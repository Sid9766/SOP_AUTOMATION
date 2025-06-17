window.addEventListener("DOMContentLoaded", () => {
  const uploadForm = document.getElementById('uploadForm');

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('pdfInput');
    const file = fileInput.files[0];
    if (!file) return alert("Please select a PDF first.");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      let steps = data.steps || [];

      steps = steps.filter(line =>
        /^(\u2022\s*)?Step\s+\d+:/.test(line.trim())
      );

      renderStepCards(steps);
      renderChart(steps);
      renderMermaid(steps);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Something went wrong while uploading the PDF. Check console.");
    }
  });

  // 🧩 Card Renderer
  function renderStepCards(steps) {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';
    steps.forEach((step, idx) => {
      const card = document.createElement('div');
      card.className = 'step-card';
      card.innerHTML = `<strong>Step ${idx + 1}:</strong> ${step}`;
      container.appendChild(card);
    });
  }

  // 📊 Chart Renderer
  function renderChart(steps) {
    const ctx = document.getElementById('chartCanvas').getContext('2d');
    const deptKeywords = ['HR', 'IT', 'Finance', 'Admin', 'Manager'];
    const counts = deptKeywords.map(dept =>
      steps.filter(step => step.includes(dept)).length
    );

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: deptKeywords,
        datasets: [{
          label: 'Mentions per Department',
          data: counts,
          backgroundColor: '#304ffe'
        }]
      },
      options: {
        plugins: { legend: { display: false }},
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // 📈 Mermaid Flowchart Renderer (final fix)
  function renderMermaid(steps) {
    const flowchartDiv = document.getElementById('flowchartContainer');
    flowchartDiv.innerHTML = '';

    if (!steps || steps.length === 0) {
      flowchartDiv.innerHTML = '<p style="color:red;">No valid steps found.</p>';
      return;
    }

    function sanitize(text) {
      return text
        .replace(/["]/g, "'")
        .replace(/[:]/g, " -")
        .replace(/[<>]/g, "")
        .replace(/\n/g, " ")
        .replace(/\./g, "")
        .replace(/[^a-zA-Z0-9\s\-']/g, "")
        .trim();
    }

    let flowchart = 'graph TD;\n';

    if (steps.length === 1) {
      const label = sanitize(steps[0]);
      flowchart += `A["${label}"];\n`;
    } else {
      steps.forEach((step, i) => {
        const id = `s${i}`;
        const label = sanitize(step);
        const nextId = `s${i + 1}`;
        flowchart += `${id}["${label}"];\n`;
        if (i < steps.length - 1) {
          flowchart += `${id} --> ${nextId};\n`;
        }
      });
    }

    console.log("✅ Mermaid input:\n", flowchart);

    const el = document.createElement('div');
    el.className = 'mermaid';
    el.innerText = flowchart;
    flowchartDiv.appendChild(el);

    try {
      window.mermaid.init(undefined, el);
    } catch (err) {
      flowchartDiv.innerHTML = `<p style="color:red;">Mermaid rendering failed: ${err.message}</p>`;
      console.error("❌ Mermaid error:", err);
    }
  }
});
