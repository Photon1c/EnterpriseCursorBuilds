import GUI from 'lil-gui';

export function setupControls(immuneSystem) {
    const gui = new GUI({ width: 300 }); // 60% larger

    gui.add({ addWBC: () => immuneSystem.addWBC() }, 'addWBC').name('Add White Blood Cell');
    gui.add({ addPathogen: () => immuneSystem.addPathogen() }, 'addPathogen').name('Add Pathogen');
    gui.add({ addCancerCell: () => immuneSystem.addCancerCell() }, 'addCancerCell').name('Add Cancer Cell');
    gui.add({ addTCell: () => immuneSystem.addTCell() }, 'addTCell').name('Add Cytotoxic T Cell');

    gui.add(immuneSystem.chemicalField, 'diffusionRate', 0.01, 0.1).name('Diffusion Rate');
    gui.add(immuneSystem.chemicalField, 'decayRate', 0.001, 0.05).name('Decay Rate');
	gui.add({ addDendriticCell: () => immuneSystem.addDendriticCell() }, 'addDendriticCell').name('Add Dendritic Cell');
	gui.add({ addRegulatoryTCell: () => immuneSystem.addRegulatoryTCell() }, 'addRegulatoryTCell').name('Add Regulatory T Cell');

}
