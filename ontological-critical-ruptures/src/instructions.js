/**
 * Instructions for the CSINT Globe application
 */

const instructions = {
  title: "CSINT Globe Instructions",
  sections: [
    {
      title: "Basic Navigation",
      items: [
        "Rotate the globe by clicking and dragging.",
        "Zoom in/out using the mouse wheel or trackpad pinch.",
        "Right-click and drag to pan the view.",
        "Double-click on a point to zoom to that location."
      ]
    },
    {
      title: "Keyboard Shortcuts",
      items: [
        "Press 'I' to display these help instructions.",
        "Press 'H' to hide all UI elements and view only the globe.",
        "Press 'S' to show all UI elements again.",
        "Press 'U' to toggle the controls panel.",
        "Press 'ESC' to exit expanded views."
      ]
    },
    {
      title: "Chat Assistant",
      items: [
        "Use the chat to ask questions about the globe and data.",
        "Click on the chat area to expand for better readability.",
        "Press ESC to collapse the expanded chat view.",
        "The assistant can provide information about visible data points."
      ]
    },
    {
      title: "Overlays",
      items: [
        "Toggle different data overlays using the controls panel.",
        "Adjust opacity and visibility of each overlay.",
        "Select overlay types from the dropdown menu.",
        "Adjust the globe color to better visualize certain overlays."
      ]
    }
  ],
  footer: "CSINT Globe - Interactive OSINT Visualization Tool"
};

/**
 * Display instructions in an overlay modal
 */
export function showInstructions() {
  // Remove any existing instructions modal
  const existingModal = document.getElementById('instructions-modal');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'instructions-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  modal.style.zIndex = '20000';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';

  // Create content container
  const content = document.createElement('div');
  content.style.width = '80%';
  content.style.maxWidth = '800px';
  content.style.maxHeight = '90%';
  content.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  content.style.borderRadius = '8px';
  content.style.padding = '30px';
  content.style.color = 'white';
  content.style.overflowY = 'auto';
  content.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
  
  // Get color variables
  const globeColor = getComputedStyle(document.documentElement).getPropertyValue('--globe-color').trim() || '#00ffff';
  const globeColorRGB = getComputedStyle(document.documentElement).getPropertyValue('--globe-color-rgb').trim() || '0, 255, 255';
  
  // Add border using globe color
  content.style.border = `2px solid ${globeColor}`;
  content.style.boxShadow = `0 0 30px rgba(${globeColorRGB}, 0.3)`;

  // Create title
  const title = document.createElement('h1');
  title.textContent = instructions.title;
  title.style.textAlign = 'center';
  title.style.color = globeColor;
  title.style.marginBottom = '30px';
  title.style.textShadow = `0 0 10px rgba(${globeColorRGB}, 0.5)`;
  content.appendChild(title);

  // Add sections
  instructions.sections.forEach(section => {
    const sectionTitle = document.createElement('h2');
    sectionTitle.textContent = section.title;
    sectionTitle.style.color = globeColor;
    sectionTitle.style.margin = '20px 0 10px 0';
    content.appendChild(sectionTitle);

    const list = document.createElement('ul');
    list.style.paddingLeft = '20px';
    list.style.marginBottom = '20px';

    section.items.forEach(item => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      listItem.style.margin = '10px 0';
      listItem.style.lineHeight = '1.5';
      listItem.style.color = 'rgba(255, 255, 255, 0.9)';
      
      // Highlight keyboard keys in the text
      if (item.includes("'")) {
        const text = item;
        listItem.innerHTML = text.replace(/'([A-Z]|ESC)'/g, match => {
          const key = match.replace(/'/g, '');
          return `<span style="display:inline-block; background:rgba(${globeColorRGB}, 0.2); border:1px solid rgba(${globeColorRGB}, 0.4); border-radius:4px; padding:1px 6px; margin:0 3px; color:${globeColor}; font-weight:bold;">${key}</span>`;
        });
      }
      
      list.appendChild(listItem);
    });

    content.appendChild(list);
  });

  // Add footer
  const footer = document.createElement('p');
  footer.textContent = instructions.footer;
  footer.style.textAlign = 'center';
  footer.style.marginTop = '30px';
  footer.style.opacity = '0.7';
  footer.style.fontStyle = 'italic';
  content.appendChild(footer);

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '15px';
  closeButton.style.right = '15px';
  closeButton.style.width = '30px';
  closeButton.style.height = '30px';
  closeButton.style.background = `rgba(${globeColorRGB}, 0.2)`;
  closeButton.style.border = `1px solid rgba(${globeColorRGB}, 0.4)`;
  closeButton.style.borderRadius = '50%';
  closeButton.style.color = 'white';
  closeButton.style.fontSize = '16px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'flex';
  closeButton.style.alignItems = 'center';
  closeButton.style.justifyContent = 'center';
  closeButton.style.transition = 'all 0.3s ease';

  closeButton.addEventListener('mouseover', () => {
    closeButton.style.background = `rgba(${globeColorRGB}, 0.4)`;
  });

  closeButton.addEventListener('mouseout', () => {
    closeButton.style.background = `rgba(${globeColorRGB}, 0.2)`;
  });

  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Add keyboard listener to close on ESC
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // Add close button to content
  content.appendChild(closeButton);
  
  // Add content to modal
  modal.appendChild(content);
  
  // Add modal to body
  document.body.appendChild(modal);
}

export default instructions; 