import { compatibleCore } from "../misc.js";

export class wfrp4e {
    constructor(){
        console.log("Material Deck: Using system 'Warhammer Fantasy Roleplaying 4e'");
    }

    getActorData(token) {
        return compatibleCore('10.0') ? token.actor.system : token.actor.data.data;
    }

    getItemData(item) {
        return compatibleCore('10.0') ? item.system : item.data.data;
    }

    getFate(token) {
        return this.getActorData(token).status.fate.value
    }

    getFortune(token) {
        return this.getActorData(token).status.fortune.value
    }

    getWounds(token) {
        const wounds =  this.getActorData(token).status.wounds
        return {
            value: wounds.value,
            max: wounds.max
        } 
        
    }

    getCriticalWounds(token) {
        const criticalWounds = this.getActorData(token).status.criticalWounds
        return {
            value: criticalWounds.value,
            max: criticalWounds.max
        } 
    }

    getCorruption(token) {
        return this.getActorData(token).status.corruption.value
    }

    getAdvantage(token) {
        return this.getActorData(token).status.advantage.value
    }

    getResolve(token) {
        return this.getActorData(token).status.resolve.value
    }

    getResilience(token) {
        return this.getActorData(token).status.resilience.value
    }

    getAbility(token, abilityName) {
        return this.getCharacteristics(token, abilityName); 
    }

    getCharacteristics(token, characteristicName) {
        if (characteristicName == undefined ) characteristicName = `AG`;
        const characteristic = this.getActorData(token).characteristics[characteristicName.toLowerCase()]
        const val = characteristic.value;
        return (val >= 0) ? `+${val}` : val;
    }

    getFeatures(token,featureType) {
        if (featureType == undefined) featureType = 'any';
        const allItems = token.actor.items;
        if (featureType == 'any') return allItems.filter(i => i.type == 'skill' || i.type == 'talent' || i.type == "career" || i.type == 'trait');
        return allItems.filter(i => i.type == featureType);
    }
    getSpells(token,spellType) {
        const allItems = token.actor.items;
        return allItems.filter(i => i.type == 'spell')
    }

    getSpellUses(token,level,item) {
        return;
    }

    getFeatureUses(item) {
        return {available: `+${this.getItemData(item).total.value}`};
    }
    
    getHP(token) {
        return this.getWounds(token);
    }

    rollItem(item) {
        return game.wfrp4e.utility.rollItemMacro(item.name, item.type, false);
    }

    getSpeed(token) {
        return this.getActorData(token).details.move.value;
    }


    async toggleCondition(token,condition) {
        if (condition == undefined) condition = 'removeAll';
        if (condition == 'removeAll'){
            for( let effect of token.actor.effects)
                await effect.delete();
        }
        else {
            const effect = CONFIG.statusEffects.find(e => e.id === condition);
            await token.toggleEffect(effect);
        }
        return true;
    }

    roll(token,roll,options,ability,skill,save) {
        if (ability == undefined) ability = 'ag';
        return game.wfrp4e.utility.rollItemMacro(ability, "characteristic", false);
    }



    getItems(token,itemType) {
        if (itemType == undefined) itemType = 'any';
        const allItems = token.actor.items;
        if (itemType == 'any') return allItems.filter(i => i.type == 'weapon' || 
        i.type == 'ammunition' || 
        i.type == 'armour' || 
        i.type == 'trapping');
        else {
            return allItems.filter(i => i.type == itemType);
        }
    }


    getItemUses(item) {
        if ( item.type == 'ammunition') {
            return {available: this.getItemData(item).quantity.value};
        }
        else {
            return;
        }
    }

    
    /* this is all cargo-culted in and some of it could be deleted once the interface is resolved
       to not be the superset of all possible systems 
    */ 

    getAC(token) {
        return;
    }

    getShieldHP(token) {
        return;
    }

    getInitiative(token) {
        return;
    }

    toggleInitiative(token) {
        return;
    }


    getConditionIcon(condition) {
        return;
    }

    getConditionActive(token,condition) {
        return;
    }

    getTempHP(token) {
        return;
    }

    /**
     * Ring Colors
     */
     getSkillRingColor(token, skill) {
        return;
    }

    getSaveRingColor(token, save) {
        return;        
    }
}