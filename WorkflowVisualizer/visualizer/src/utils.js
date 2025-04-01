/**
 * Utilities for the I Love Lucy-Inspired Workflow Visualizer
 * Provides shared functionality across components
 */

// Prevent event propagation when dragging UI elements
export function preventDragPropagation(element) {
    element.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    
    element.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });
    
    element.addEventListener('wheel', (e) => {
        e.stopPropagation();
    });
}

// Make an element draggable within its container
export function makeElementDraggable(element, dragHandle = null) {
    const handle = dragHandle || element;
    let isDragging = false;
    let offsetX, offsetY;
    
    // Store initial position
    const initialPosition = {
        left: element.offsetLeft,
        top: element.offsetTop
    };
    
    // Track if the element has been moved
    let hasMoved = false;
    
    // Start drag
    handle.addEventListener('mousedown', (e) => {
        // Skip if clicking on a button or other interactive element
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
            return;
        }
        
        isDragging = true;
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Change cursor during drag
        element.style.cursor = 'grabbing';
        
        // Prevent other events
        e.preventDefault();
    });
    
    // Track drag movement
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Calculate new position
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;
        
        // Apply new position
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        
        // Mark as moved
        hasMoved = true;
        
        // Get container bounds
        const container = element.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Keep within container bounds
        if (elementRect.right > containerRect.right) {
            element.style.left = `${containerRect.right - elementRect.width}px`;
        }
        if (elementRect.bottom > containerRect.bottom) {
            element.style.top = `${containerRect.bottom - elementRect.height}px`;
        }
        if (elementRect.left < containerRect.left) {
            element.style.left = `${containerRect.left}px`;
        }
        if (elementRect.top < containerRect.top) {
            element.style.top = `${containerRect.top}px`;
        }
    });
    
    // End drag
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = '';
        }
    });
    
    // Reset position method
    return {
        resetPosition: () => {
            if (hasMoved) {
                element.style.left = `${initialPosition.left}px`;
                element.style.top = `${initialPosition.top}px`;
                hasMoved = false;
            }
        }
    };
}

// Panel management - minimize/maximize
export function setupPanelControls(panel, header, minimizeButton) {
    let isMinimized = false;
    
    // Store initial height for minimize/restore
    const initialHeight = panel.offsetHeight;
    const initialStyles = {
        height: initialHeight + 'px',
        overflow: 'auto',
        resize: 'both'
    };
    
    // Check if minimizeButton exists before adding event listener
    if (minimizeButton) {
        // Minimize/restore function
        minimizeButton.addEventListener('click', () => {
            if (isMinimized) {
                // Restore panel
                panel.style.height = initialStyles.height;
                panel.style.overflow = initialStyles.overflow;
                panel.style.resize = initialStyles.resize;
                
                // Show all content except header
                Array.from(panel.children).forEach(child => {
                    if (!child.classList.contains('controls-header')) {
                        child.style.display = '';
                    }
                });
                
                minimizeButton.textContent = '_';
                minimizeButton.title = 'Minimize';
                isMinimized = false;
            } else {
                // Minimize panel
                panel.style.height = 'auto';
                panel.style.overflow = 'hidden';
                panel.style.resize = 'none';
                
                // Hide all content except header
                Array.from(panel.children).forEach(child => {
                    if (!child.classList.contains('controls-header')) {
                        child.style.display = 'none';
                    }
                });
                
                minimizeButton.textContent = '□';
                minimizeButton.title = 'Restore';
                isMinimized = true;
            }
        });
    } else {
        console.warn('Minimize button not found for panel:', panel.id || 'unnamed panel');
    }
    
    return {
        minimize: () => {
            if (!isMinimized && minimizeButton) minimizeButton.click();
        },
        restore: () => {
            if (isMinimized && minimizeButton) minimizeButton.click();
        },
        toggle: () => {
            if (minimizeButton) minimizeButton.click();
        }
    };
} 