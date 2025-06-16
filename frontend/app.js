document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('pdfInput');
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a PDF file first.");
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:8000/upload/', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    let steps = data.steps || [];

    // Filter out non-step lines (defensive check)
    steps = steps.filter(line =>
      /^(\u2022\s*)?Step\s+\d+:/.test(line.trim())
    );

    // Render SOP steps as list
    const list = document.getElementById('stepsList');
    list.innerHTML = '';
    steps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      list.appendChild(li);
    });

    // Render flowchart
    const flowchartDiv = document.getElementById('flowchartContainer');
    flowchartDiv.innerHTML = '';

    if (steps.length === 0) {
      flowchartDiv.textContent = 'No valid SOP steps found for flowchart.';
      return;
    }

    // ✅ Clean Mermaid node label text
    function sanitizeLabel(text) {
      return text
        .replace(/["]/g, "'")                     // replace double quotes
        .replace(/[:]/g, " -")                    // replace colons
        .replace(/[<>]/g, "")                     // remove angle brackets
        .replace(/\n/g, " ")                      // flatten lines
        .replace(/\./g, "")                       // remove periods
        .replace(/[^a-zA-Z0-9\s\-']/g, "")        // remove other special chars
        .trim();
    }

    // ✅ Build Mermaid flowchart syntax
    let flowchart = 'graph TD;\n';
    steps.forEach((step, i) => {
      const id = `step${i}`;
      const nextId = `step${i + 1}`;
      const label = sanitizeLabel(step);

      flowchart += `${id}["${label}"];\n`;
      if (i < steps.length - 1) {
        flowchart += `${id} --> ${nextId};\n`;
      }
    });

    console.log("🧪 Mermaid Syntax:\n", flowchart);

    // ✅ Inject and render
    const flowchartEl = document.createElement('div');
    flowchartEl.classList.add('mermaid');
    flowchartEl.innerText = flowchart;
    flowchartDiv.appendChild(flowchartEl);

    window.mermaid.init(undefined, flowchartEl);
  } catch (error) {
    console.error("Upload failed:", error);
    const flowchartDiv = document.getElementById('flowchartContainer');
    flowchartDiv.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    alert("Something went wrong while uploading the PDF. Check console.");
  }
});
//I see
