export const helpContent = {
    title: "Immune System Simulation Help",
    sections: [
        {
            title: "Cell Types - press H again to exit this page.",
            content: `
                <h3>Dendritic Cells (Orange)</h3>
                <p>Sentinel cells that patrol for cancer cells. When they detect cancer:</p>
                <ul>
                    <li>They activate and emit warning signals</li>
                    <li>Migrate away from the threat</li>
                    <li>Deploy Cytotoxic T cells to the threat location</li>
                </ul>

                <h3>Cytotoxic T Cells (Cyan)</h3>
                <p>The immune system's assassins. They:</p>
                <ul>
                    <li>Follow chemical signals to find cancer cells</li>
                    <li>Can kill up to 5 cancer cells before becoming fatigued</li>
                    <li>Need 10 seconds to recover from fatigue</li>
                    <li>Show red attack animations when engaging cancer cells</li>
                </ul>

                <h3>Regulatory T Cells (Purple)</h3>
                <p>Immune system moderators that:</p>
                <ul>
                    <li>Prevent excessive immune responses</li>
                    <li>Create suppression zones that slow nearby immune cells</li>
                    <li>Help maintain immune system balance</li>
                </ul>

                <h3>Cancer Cells (Red)</h3>
                <p>Malignant cells that:</p>
                <ul>
                    <li>Multiply if left unchecked</li>
                    <li>Emit chemical signals that attract immune cells</li>
                    <li>Can be eliminated by Cytotoxic T cells</li>
                </ul>`
        },
        {
            title: "Controls",
            content: `
                <h3>Simulation Controls</h3>
                <ul>
                    <li><strong>Add Cancer Cell:</strong> Click to add cancer cells</li>
                    <li><strong>Add Dendritic Cell:</strong> Deploy sentinel cells</li>
                    <li><strong>Add CTL:</strong> Deploy Cytotoxic T cells</li>
                    <li><strong>Add Treg:</strong> Deploy Regulatory T cells</li>
                    <li><strong>Clear All:</strong> Reset the simulation</li>
                </ul>

                <h3>Statistics</h3>
                <p>The kill counter at the bottom shows how many cancer cells have been eliminated.</p>`
        },
        {
            title: "Cell Behaviors",
            content: `
                <h3>Chemical Signaling</h3>
                <p>Cells communicate through chemical signals:</p>
                <ul>
                    <li>Cancer cells emit attraction signals</li>
                    <li>Dendritic cells emit CXCL10 to guide CTLs</li>
                    <li>Tregs create suppression zones</li>
                </ul>

                <h3>Cell States</h3>
                <ul>
                    <li>CTLs switch between 'primed' and 'fatigued' states</li>
                    <li>Dendritic cells activate upon cancer detection</li>
                    <li>Tregs pulse their suppression effect</li>
                </ul>`
        }
    ]
}; 