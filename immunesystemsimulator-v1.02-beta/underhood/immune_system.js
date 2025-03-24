import { WBC } from '../cells/wbc.js';
import { Pathogen } from '../cells/pathogen.js';
import { CancerCell } from '../cells/cancer_cell.js';
import { CytotoxicTCell } from '../cells/cytotoxic_tcell.js';
import { DendriticCell } from '../cells/dendritic_cell.js';
import { RegulatoryTCell } from '../cells/regulatory_tcell.js';
import { ChemicalField } from './chemical_field.js';

export class ImmuneSystem {
    constructor(scene) {
        this.scene = scene;
        this.wbcs = [];
        this.tcells = [];
        this.dcs = [];
        this.tregs = [];
        this.pathogens = [];
        this.cancerCells = [];
        this.chemicalField = new ChemicalField();
    }

    addWBC() {
        const wbc = new WBC(this.scene);
        this.wbcs.push(wbc);
    }

    addPathogen() {
        const pathogen = new Pathogen(this.scene);
        this.pathogens.push(pathogen);
        this.chemicalField.addSignal(pathogen.mesh.position, 2); // Pathogens emit chemoattractant
    }

    addCancerCell() {
        const cell = new CancerCell(this.scene);
        this.cancerCells.push(cell);
        this.chemicalField.addSignal(cell.mesh.position, 2, 'cancer');
    }

    addTCell(position = null) {
        const tcell = new CytotoxicTCell(this.scene, position);
        this.tcells.push(tcell);
    }


    addDendriticCell() {
        const dc = new DendriticCell(this.scene, this); // pass immune system reference
        this.dcs.push(dc);
    }


    addRegulatoryTCell() {
        const treg = new RegulatoryTCell(this.scene);
        this.tregs.push(treg);
    }

    update() {
        this.chemicalField.update();

        for (let i = this.wbcs.length - 1; i >= 0; i--) {
            this.wbcs[i].update(this.chemicalField, this.pathogens);
            if (this.wbcs[i].energy <= 0) {
                this.wbcs.splice(i, 1);
            }
        }

        for (let i = this.tcells.length - 1; i >= 0; i--) {
            this.tcells[i].update(this.chemicalField, this.cancerCells);
            if (this.tcells[i].dead) this.tcells.splice(i, 1);
        }

        for (let pathogen of this.pathogens) {
            pathogen.update();
            this.chemicalField.addSignal(pathogen.mesh.position, 0.5);
        }

        for (let i = this.cancerCells.length - 1; i >= 0; i--) {
            const cell = this.cancerCells[i];
            cell.update(this.cancerCells, this);
            this.chemicalField.addSignal(cell.mesh.position, 0.5, 'cancer');
        }

        for (let dc of this.dcs) {
            dc.update(this.cancerCells, this.chemicalField);
        }

        for (let treg of this.tregs) {
            treg.update(this.chemicalField);
        }
    }
}
