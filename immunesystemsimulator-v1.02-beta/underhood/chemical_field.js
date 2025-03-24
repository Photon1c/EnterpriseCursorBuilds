import * as THREE from 'three';


export class ChemicalField {
    constructor(size = 20, diffusionRate = 0.05, decayRate = 0.002) {
        this.size = size;
        this.diffusionRate = diffusionRate;
        this.decayRate = decayRate;
        this.field = new Array(size).fill(0).map(() =>
            new Array(size).fill(0).map(() => ({ pathogen: 0, cancer: 0 }))
        );
    }

    addSignal(position, strength = 1, type = 'pathogen') {
        let x = Math.floor(position.x + this.size / 2);
        let z = Math.floor(position.z + this.size / 2);
        if (this.isValid(x, z) && this.field[x][z][type] !== undefined) {
            this.field[x][z][type] += strength;
        }
    }

    getSignalAt(position, type = 'pathogen') {
        let x = Math.floor(position.x + this.size / 2);
        let z = Math.floor(position.z + this.size / 2);
        return this.isValid(x, z) && this.field[x][z][type] !== undefined ? this.field[x][z][type] : 0;
    }

    getGradient(position, type = 'default') {
        const epsilon = 0.1;
        const base = this.getSignalAt(position, type);

        const dx = this.getSignalAt(new THREE.Vector3(position.x + epsilon, position.y, position.z), type) - base;
        const dz = this.getSignalAt(new THREE.Vector3(position.x, position.y, position.z + epsilon), type) - base;

        return new THREE.Vector3(dx, 0, dz);
    }


    update() {
        const newField = new Array(this.size).fill(0).map(() =>
            new Array(this.size).fill(0).map(() => ({ pathogen: 0, cancer: 0 }))
        );

        for (let x = 1; x < this.size - 1; x++) {
            for (let z = 1; z < this.size - 1; z++) {
                for (let type of ['pathogen', 'cancer']) {
                    let val = this.field[x][z][type];
                    let diffusion = this.diffusionRate * (
                        this.field[x - 1][z][type] + this.field[x + 1][z][type] +
                        this.field[x][z - 1][type] + this.field[x][z + 1][type] -
                        4 * val
                    );
                    newField[x][z][type] = val + diffusion - this.decayRate * val;
                }
            }
        }

        this.field = newField;



    }

    isValid(x, z) {
        return x >= 0 && x < this.size && z >= 0 && z < this.size;
    }
}
