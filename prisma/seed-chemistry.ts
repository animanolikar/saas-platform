import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Organic Chemistry Exam...');

    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('Organization not found. Run seed.ts first.');
        return;
    }

    const examTitle = 'Organic Chemistry Finals - Grade 12';

    // Check if exam exists
    let chemistryExam = await prisma.exam.findFirst({
        where: { organizationId: org.id, title: examTitle }
    });

    if (chemistryExam) {
        console.log('Chemistry Exam already exists. Deleting and re-seeding...');
        await prisma.examQuestion.deleteMany({ where: { examId: chemistryExam.id } });
        await prisma.examAttempt.deleteMany({ where: { examId: chemistryExam.id } }); // Safety check
        await prisma.exam.delete({ where: { id: chemistryExam.id } });
    }

    // Create Exam
    chemistryExam = await prisma.exam.create({
        data: {
            organizationId: org.id,
            title: examTitle,
            description: 'Final assessment for Grade 12 Organic Chemistry covering Haloalkanes, Alcohols, Carbonyls, Amines, and Biomolecules.',
            durationSeconds: 5400, // 1.5 hours
            passPercentage: 40.0,
            status: 'PUBLISHED',
            settings: { shuffleQuestions: true, showResults: true }
        }
    });

    console.log(`Created Exam: ${examTitle}`);

    // Create Tags
    const topics = [
        'Haloalkanes & Haloarenes',
        'Alcohols, Phenols & Ethers',
        'Aldehydes, Ketones & Carboxylic Acids',
        'Amines',
        'Biomolecules'
    ];

    const tagMap: Record<string, string> = {};
    for (const topic of topics) {
        let t = await prisma.tag.findFirst({ where: { organizationId: org.id, name: topic } });
        if (!t) {
            t = await prisma.tag.create({ data: { name: topic, organizationId: org.id, type: 'TOPIC' } });
        }
        tagMap[topic] = t.id;
    }

    // Questions Database (Real Questions)
    const questionsData = [
        // --- Haloalkanes & Haloarenes ---
        {
            text: 'Which of the following compounds will undergo SN1 reaction most readily?',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'MEDIUM',
            options: [
                { text: '(CH3)3C-Br', isCorrect: true },
                { text: '(CH3)2CH-Br', isCorrect: false },
                { text: 'CH3CH2-Br', isCorrect: false },
                { text: 'CH3-Br', isCorrect: false }
            ],
            explanation: 'Tertiary carbocations formed from (CH3)3C-Br are the most stable due to inductive effect and hyperconjugation, favoring SN1.'
        },
        {
            text: 'The reaction of chlorobenzene with aqueous NaOH requiring high temperature and pressure is an example of:',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'HARD',
            options: [
                { text: 'Nucleophilic substitution', isCorrect: true },
                { text: 'Electrophilic substitution', isCorrect: false },
                { text: 'Addition reaction', isCorrect: false },
                { text: 'Elimination reaction', isCorrect: false }
            ],
            explanation: 'It is a nucleophilic aromatic substitution reaction (Dow Process), difficult due to partial double bond character of C-Cl.'
        },
        {
            text: 'Which reagent is used to convert an alcohol to an alkyl chloride with the best yield and gaseous byproducts?',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'EASY',
            options: [
                { text: 'SOCl2', isCorrect: true },
                { text: 'PCl5', isCorrect: false },
                { text: 'PCl3', isCorrect: false },
                { text: 'HCl/ZnCl2', isCorrect: false }
            ],
            explanation: 'Thionyl chloride (SOCl2) gives gaseous byproducts (SO2, HCl) which escape, leaving pure alkyl halide.'
        },
        {
            text: 'Finkelstein reaction is used for the preparation of:',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'EASY',
            options: [
                { text: 'Alkyl Iodides', isCorrect: true },
                { text: 'Alkyl Fluorides', isCorrect: false },
                { text: 'Alkyl Bromides', isCorrect: false },
                { text: 'Alkyl Chlorides', isCorrect: false }
            ],
            explanation: 'Finkelstein reaction involves the treatment of alkyl chlorides/bromides with NaI in dry acetone to form alkyl iodides.'
        },
        {
            text: 'Swarts reaction involves the use of which reagent?',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'MEDIUM',
            options: [
                { text: 'AgF', isCorrect: true },
                { text: 'NaI', isCorrect: false },
                { text: 'Cl2/UV', isCorrect: false },
                { text: 'HBr', isCorrect: false }
            ],
            explanation: 'Swarts reaction is used for synthesizing alkyl fluorides using metallic fluorides like AgF, Hg2F2, CoF2, or SbF3.'
        },
        {
            text: 'Grignard reagents are prepared by the reaction of haloalkanes with Magnesium in the presence of:',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'EASY',
            options: [
                { text: 'Dry Ether', isCorrect: true },
                { text: 'Water', isCorrect: false },
                { text: 'Alcohol', isCorrect: false },
                { text: 'Acetone', isCorrect: false }
            ],
            explanation: 'Dry ether is used to prevent the reaction of the highly reactive Grignard reagent with moisture (protons).'
        },
        {
            text: 'Reaction of ethyl chloride with alcoholic KOH gives:',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Ethene', isCorrect: true },
                { text: 'Ethanol', isCorrect: false },
                { text: 'Ethane', isCorrect: false },
                { text: 'Ethyl ether', isCorrect: false }
            ],
            explanation: 'Alcoholic KOH acts as a strong base and favors beta-elimination (dehydrohalogenation) to form alkenes.'
        },
        {
            text: 'Which of the following molecules is chiral?',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'MEDIUM',
            options: [
                { text: '2-Bromobutane', isCorrect: true },
                { text: '1-Bromobutane', isCorrect: false },
                { text: '2-Bromopropane', isCorrect: false },
                { text: '1-Bromopropane', isCorrect: false }
            ],
            explanation: '2-Bromobutane has a chiral center (C2) bonded to four different groups: H, Br, CH3, and C2H5.'
        },
        {
            text: 'For the same alkyl group, the boiling point is highest for:',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'EASY',
            options: [
                { text: 'R-I', isCorrect: true },
                { text: 'R-Br', isCorrect: false },
                { text: 'R-Cl', isCorrect: false },
                { text: 'R-F', isCorrect: false }
            ],
            explanation: 'Boiling point increases with molecular mass and size due to stronger van der Waals forces (I > Br > Cl > F).'
        },
        {
            text: 'DDT is chemically known as:',
            topic: 'Haloalkanes & Haloarenes',
            difficulty: 'EASY',
            options: [
                { text: 'p,p\'-Dichlorodiphenyltrichloroethane', isCorrect: true },
                { text: 'p,p\'-Dichlorodiphenyldichloroethane', isCorrect: false },
                { text: 'p,p\'-Dichlorodiphenyltrichloroethene', isCorrect: false },
                { text: 'None of the above', isCorrect: false }
            ],
            explanation: 'DDT stands for p,p\'-Dichlorodiphenyltrichloroethane, a slightly controversial insecticide.'
        },

        // --- Alcohols, Phenols & Ethers ---
        {
            text: 'Phenol is more acidic than ethanol because:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Phenoxide ion is resonance stabilized', isCorrect: true },
                { text: 'Ethoxide ion is resonance stabilized', isCorrect: false },
                { text: 'Phenol forms hydrogen bonds', isCorrect: false },
                { text: 'Phenol has a higher boiling point', isCorrect: false }
            ],
            explanation: 'The phenoxide ion is stabilized by resonance, unlike the ethoxide ion.'
        },
        {
            text: 'Williamson synthesis is used for the preparation of:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'EASY',
            options: [
                { text: 'Ethers', isCorrect: true },
                { text: 'Alcohols', isCorrect: false },
                { text: 'Ketones', isCorrect: false },
                { text: 'Haloalkanes', isCorrect: false }
            ],
            explanation: 'Reaction of alkyl halide with sodium alkoxide to form ether.'
        },
        {
            text: 'Lucas reagent is a mixture of:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Conc. HCl and anhydrous ZnCl2', isCorrect: true },
                { text: 'Conc. HNO3 and anhydrous ZnCl2', isCorrect: false },
                { text: 'Conc. HCl and hydrous ZnCl2', isCorrect: false },
                { text: 'Conc. H2SO4 and ZnCl2', isCorrect: false }
            ],
            explanation: 'Lucas reagent (Concentrated HCl + Anhydrous ZnCl2) is used to differentiate between primary, secondary, and tertiary alcohols.'
        },
        {
            text: 'Reimer-Tiemann reaction converts Phenol into:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'HARD',
            options: [
                { text: 'Salicylaldehyde', isCorrect: true },
                { text: 'Salicylic Acid', isCorrect: false },
                { text: 'Benzoic Acid', isCorrect: false },
                { text: 'Benzaldehyde', isCorrect: false }
            ],
            explanation: 'Phenol reacts with CHCl3 in the presence of NaOH to give Salicylaldehyde (o-hydroxybenzaldehyde).'
        },
        {
            text: 'Kolbe’s reaction involves heating sodium phenoxide with:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'MEDIUM',
            options: [
                { text: 'CO2', isCorrect: true },
                { text: 'CO', isCorrect: false },
                { text: 'CHCl3', isCorrect: false },
                { text: 'CCl4', isCorrect: false }
            ],
            explanation: 'Kolbe’s reaction uses CO2 at 400K and 4-7 atm pressure to form Salicylic Acid.'
        },
        {
            text: 'PCC (Pyridinium Chlorochromate) oxidizes primary alcohols to:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Aldehydes', isCorrect: true },
                { text: 'Carboxylic Acids', isCorrect: false },
                { text: 'Ketones', isCorrect: false },
                { text: 'Ethers', isCorrect: false }
            ],
            explanation: 'PCC is a mild oxidizing agent that stops the oxidation of primary alcohols at the aldehyde stage.'
        },
        {
            text: 'Acid-catalyzed dehydration of ethanol at 443 K forms:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'EASY',
            options: [
                { text: 'Ethene', isCorrect: true },
                { text: 'Ethoxyethane', isCorrect: false },
                { text: 'Methoxymethane', isCorrect: false },
                { text: 'Ethanal', isCorrect: false }
            ],
            explanation: 'At 443 K with conc. H2SO4, ethanol undergoes dehydration to form ethene. At 413 K, it forms ether.'
        },
        {
            text: 'Cleavage of anisole (methoxybenzene) with HI gives:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'HARD',
            options: [
                { text: 'Phenol + Methyl Iodide', isCorrect: true },
                { text: 'Iodobenzene + Methanol', isCorrect: false },
                { text: 'Phenol + Methanol', isCorrect: false },
                { text: 'Iodobenzene + Methyl Iodide', isCorrect: false }
            ],
            explanation: 'The O-CH3 bond is weaker than O-C6H5 (partial double bond), so it breaks to give Phenol and CH3I.'
        },
        {
            text: 'Commercially, "Wood Spirit" refers to:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'EASY',
            options: [
                { text: 'Methanol', isCorrect: true },
                { text: 'Ethanol', isCorrect: false },
                { text: 'Acetone', isCorrect: false },
                { text: 'Benzene', isCorrect: false }
            ],
            explanation: 'Methanol (CH3OH) was historically produced by destructive distillation of wood.'
        },
        {
            text: 'Phenol reacts with concentrated HNO3 to give:',
            topic: 'Alcohols, Phenols & Ethers',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Picric Acid', isCorrect: true },
                { text: 'o-Nitrophenol', isCorrect: false },
                { text: 'p-Nitrophenol', isCorrect: false },
                { text: 'm-Nitrophenol', isCorrect: false }
            ],
            explanation: 'Concentrated HNO3 nitrates phenol at all ortho and para positions giving 2,4,6-trinitrophenol (Picric Acid).'
        },

        // --- Aldehydes, Ketones & Carboxylic Acids ---
        {
            text: 'Which of the following undergoes Cannizzaro reaction?',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Methanal (HCHO)', isCorrect: true },
                { text: 'Ethanal (CH3CHO)', isCorrect: false },
                { text: 'Propanone', isCorrect: false },
                { text: 'Acetophenone', isCorrect: false }
            ],
            explanation: 'Aldehydes lacking alpha-hydrogens (like HCHO, Benzaldehyde) undergo Cannizzaro reaction.'
        },
        {
            text: 'Reaction of Acetone with Grignard reagent (CH3MgBr) followed by hydrolysis gives:',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'HARD',
            options: [
                { text: 'Tertiary Butyl Alcohol', isCorrect: true },
                { text: 'Secondary Alcohol', isCorrect: false },
                { text: 'Primary Alcohol', isCorrect: false },
                { text: 'Isobutyl Alcohol', isCorrect: false }
            ],
            explanation: 'Ketones react with Grignard reagents to yield tertiary alcohols.'
        },
        {
            text: 'Toluene reacts with CrO3 in presence of Ac2O to give (Etard Reaction):',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'HARD',
            options: [
                { text: 'Benzaldehyde', isCorrect: true },
                { text: 'Benzoic Acid', isCorrect: false },
                { text: 'Benzyl Alcohol', isCorrect: false },
                { text: 'Phenol', isCorrect: false }
            ],
            explanation: 'Etard reaction oxidizes the methyl group on the benzene ring to an aldehyde group.'
        },
        {
            text: 'Aldol condensation is given by aldehydes/ketones containing:',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Alpha-hydrogen', isCorrect: true },
                { text: 'Beta-hydrogen', isCorrect: false },
                { text: 'Gamma-hydrogen', isCorrect: false },
                { text: 'No hydrogens', isCorrect: false }
            ],
            explanation: 'The acidity of alpha-hydrogens allows the formation of carbanions in base, leading to Aldol condensation.'
        },
        {
            text: 'Tollen’s reagent is chemically:',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'EASY',
            options: [
                { text: 'Ammoniacal Silver Nitrate', isCorrect: true },
                { text: 'Alkaline Copper Sulphate', isCorrect: false },
                { text: 'Neutral Ferric Chloride', isCorrect: false },
                { text: 'Sodium Potassium Tartrate', isCorrect: false }
            ],
            explanation: 'Tollen’s reagent (Ammoniacal Silver Nitrate) oxidizes aldehydes to acids and reduces itself to metallic silver (Silver Mirror).'
        },
        {
            text: 'Fehling’s solution is used to detect:',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Aliphatic Aldehydes', isCorrect: true },
                { text: 'Aromatic Aldehydes', isCorrect: false },
                { text: 'Ketones', isCorrect: false },
                { text: 'Alcohols', isCorrect: false }
            ],
            explanation: 'Fehling’s test is positive for aliphatic aldehydes (Red ppt) but negative for aromatic aldehydes and ketones.'
        },
        {
            text: 'Clemmensen reduction uses which reagent to convert >C=O to >CH2?',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Zn-Hg / HCl', isCorrect: true },
                { text: 'NH2NH2 / KOH', isCorrect: false },
                { text: 'LiAlH4', isCorrect: false },
                { text: 'NaBH4', isCorrect: false }
            ],
            explanation: 'Zinc amalgam and concentrated HCl reduce the carbonyl group to a methylene group.'
        },
        {
            text: 'Which reaction converts a carboxyl group to a primary amine with one less carbon?',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'HARD',
            options: [
                { text: 'Schmidt Reaction', isCorrect: true },
                { text: 'Decarboxylation', isCorrect: false },
                { text: 'Reduction', isCorrect: false },
                { text: 'Esterification', isCorrect: false }
            ],
            explanation: 'Schmidt reaction (using Hydrazoic acid) converts RCOOH to RNH2.'
        },
        {
            text: 'Hell-Volhard-Zelinsky (HVZ) reaction is given by:',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'HARD',
            options: [
                { text: 'Acids with alpha-H', isCorrect: true },
                { text: 'Acids without alpha-H', isCorrect: false },
                { text: 'Aldehydes with alpha-H', isCorrect: false },
                { text: 'Ketones with alpha-H', isCorrect: false }
            ],
            explanation: 'HVZ reaction involves alpha-halogenation of carboxylic acids using X2/Red P.'
        },
        {
            text: 'Which acid is found in vinegar?',
            topic: 'Aldehydes, Ketones & Carboxylic Acids',
            difficulty: 'EASY',
            options: [
                { text: 'Acetic Acid', isCorrect: true },
                { text: 'Formic Acid', isCorrect: false },
                { text: 'Citric Acid', isCorrect: false },
                { text: 'Lactic Acid', isCorrect: false }
            ],
            explanation: 'Vinegar is a dilute solution (5-8%) of acetic acid.'
        },

        // --- Amines ---
        {
            text: 'Which is the strongest base in aqueous solution?',
            topic: 'Amines',
            difficulty: 'HARD',
            options: [
                { text: '(CH3)2NH', isCorrect: true },
                { text: 'CH3NH2', isCorrect: false },
                { text: '(CH3)3N', isCorrect: false },
                { text: 'C6H5NH2', isCorrect: false }
            ],
            explanation: 'Secondary amines are strongest in aqueous phase due to solvation, inductive, and steric factors combined.'
        },
        {
            text: 'Carbylamine reaction is a test for:',
            topic: 'Amines',
            difficulty: 'EASY',
            options: [
                { text: 'Primary Amines Only', isCorrect: true },
                { text: 'Secondary Amines Only', isCorrect: false },
                { text: 'Tertiary Amines Only', isCorrect: false },
                { text: 'All Amines', isCorrect: false }
            ],
            explanation: 'Only primary amines (aliphatic & aromatic) give the fouling smelling isocyanide with CHCl3/KOH.'
        },
        {
            text: 'Hoffmann Bromamide degradation reaction is used for:',
            topic: 'Amines',
            difficulty: 'HARD',
            options: [
                { text: 'Descending the series', isCorrect: true },
                { text: 'Ascending the series', isCorrect: false },
                { text: 'Purifying amines', isCorrect: false },
                { text: 'Distinguishing amines', isCorrect: false }
            ],
            explanation: 'It converts an amide to a primary amine with one carbon atom less than the parent amide.'
        },
        {
            text: 'Gabriel Phthalimide synthesis is used to prepare:',
            topic: 'Amines',
            difficulty: 'HARD',
            options: [
                { text: 'Aliphatic Primary Amines', isCorrect: true },
                { text: 'Aromatic Primary Amines', isCorrect: false },
                { text: 'Secondary Amines', isCorrect: false },
                { text: 'Tertiary Amines', isCorrect: false }
            ],
            explanation: 'It yields pure primary aliphatic amines. Aromatic amines cannot be prepared as aryl halides do not undergo nucleophilic substitution with phthalimide.'
        },
        {
            text: 'Hinsberg reagent is:',
            topic: 'Amines',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Benzenesulfonyl chloride', isCorrect: true },
                { text: 'Benzenesulfonic acid', isCorrect: false },
                { text: 'Benzoyl chloride', isCorrect: false },
                { text: 'Benzyl chloride', isCorrect: false }
            ],
            explanation: 'C6H5SO2Cl is used to distinguish primary, secondary, and tertiary amines.'
        },
        {
            text: 'Aniline reacts with bromine water to give a white precipitate of:',
            topic: 'Amines',
            difficulty: 'EASY',
            options: [
                { text: '2,4,6-Tribromoaniline', isCorrect: true },
                { text: 'o-Bromoaniline', isCorrect: false },
                { text: 'p-Bromoaniline', isCorrect: false },
                { text: 'm-Bromoaniline', isCorrect: false }
            ],
            explanation: 'The amino group is highly activating, leading to trisubstitution with bromine water.'
        },
        {
            text: 'The intermediate formed in Sandmeyer reaction involves:',
            topic: 'Amines',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Benzene Diazonium Halide', isCorrect: true },
                { text: 'Phenyl Carbocation', isCorrect: false },
                { text: 'Benzyne', isCorrect: false },
                { text: 'Chlorobenzene', isCorrect: false }
            ],
            explanation: 'Sandmeyer reaction proceeds through the formation of a diazonium salt.'
        },
        {
            text: 'Reaction of diazonium salt with phenol in basic medium is called:',
            topic: 'Amines',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Coupling Reaction', isCorrect: true },
                { text: 'Cannizzaro Reaction', isCorrect: false },
                { text: 'Friedel-Crafts', isCorrect: false },
                { text: 'Etard Reaction', isCorrect: false }
            ],
            explanation: 'Coupling reactions yield Azo dyes. Phenol couples in basic medium.'
        },
        {
            text: 'The best method to prepare primary amines from alkyl halides without changing the number of carbon atoms is:',
            topic: 'Amines',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Gabriels synthesis', isCorrect: true },
                { text: 'Hoffmann Bromamide', isCorrect: false },
                { text: 'Curtius rearrangement', isCorrect: false },
                { text: 'Schmidt reaction', isCorrect: false }
            ],
            explanation: 'Within the context of Grade 12 CBSE, Gabriel synthesis or Ammonolysis (though mixtures) are key. Gabriel is specific for 1 degree.'
        },
        {
            text: 'Ethylamine reacts with nitrous acid (HNO2) to form:',
            topic: 'Amines',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Ethanol', isCorrect: true },
                { text: 'Nitroethane', isCorrect: false },
                { text: 'Diazonium salt', isCorrect: false },
                { text: 'Ethane', isCorrect: false }
            ],
            explanation: 'Primary aliphatic amines form unstable diazonium salts with HNO2 which liberate N2 and form alcohols.'
        },

        // --- Biomolecules ---
        {
            text: 'Which linkage joins monosaccharide units in glycogen?',
            topic: 'Biomolecules',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Glycosidic linkage', isCorrect: true },
                { text: 'Peptide linkage', isCorrect: false },
                { text: 'Phosphodiester linkage', isCorrect: false },
                { text: 'Hydrogen bond', isCorrect: false }
            ],
            explanation: 'Glycosidic bond (C-O-C) links sugars.'
        },
        {
            text: 'Deficiency of Vitamin C causes:',
            topic: 'Biomolecules',
            difficulty: 'EASY',
            options: [
                { text: 'Scurvy', isCorrect: true },
                { text: 'Rickets', isCorrect: false },
                { text: 'Night Blindness', isCorrect: false },
                { text: 'Sterility', isCorrect: false }
            ],
            explanation: 'Scurvy (bleeding gums) is due to lack of Ascorbic Acid.'
        },
        {
            text: 'Proteins are polymers of:',
            topic: 'Biomolecules',
            difficulty: 'EASY',
            options: [
                { text: 'Alpha-Amino acids', isCorrect: true },
                { text: 'Beta-Amino acids', isCorrect: false },
                { text: 'Gamma-Amino acids', isCorrect: false },
                { text: 'Hydroxy acids', isCorrect: false }
            ],
            explanation: 'Natural proteins are polymers of L-alpha-amino acids.'
        },
        {
            text: 'Which base is present in DNA but not in RNA?',
            topic: 'Biomolecules',
            difficulty: 'EASY',
            options: [
                { text: 'Thymine', isCorrect: true },
                { text: 'Uracil', isCorrect: false },
                { text: 'Cytosine', isCorrect: false },
                { text: 'Adenine', isCorrect: false }
            ],
            explanation: 'DNA contains Thymine (5-methyluracil), whereas RNA contains Uracil.'
        },
        {
            text: 'Denaturation of proteins leads to loss of which structure?',
            topic: 'Biomolecules',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Secondary and Tertiary', isCorrect: true },
                { text: 'Primary', isCorrect: false },
                { text: 'All structures', isCorrect: false },
                { text: 'Only Quaternary', isCorrect: false }
            ],
            explanation: 'Denaturation destroys 2° and 3° structures but leaves the primary sequence intact.'
        },
        {
            text: 'Sucrose on hydrolysis gives:',
            topic: 'Biomolecules',
            difficulty: 'EASY',
            options: [
                { text: 'Glucose + Fructose', isCorrect: true },
                { text: 'Glucose + Galactose', isCorrect: false },
                { text: 'Two Glucose units', isCorrect: false },
                { text: 'Fructose + Galactose', isCorrect: false }
            ],
            explanation: 'Sucrose is a disaccharide of alpha-D-glucose and beta-D-fructose.'
        },
        {
            text: 'Which of the following is an essential amino acid?',
            topic: 'Biomolecules',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Valine', isCorrect: true },
                { text: 'Glycine', isCorrect: false },
                { text: 'Alanine', isCorrect: false },
                { text: 'Serine', isCorrect: false }
            ],
            explanation: 'Valine cannot be synthesized by the body and is essential.'
        },
        {
            text: 'Glucose contains which functional group?',
            topic: 'Biomolecules',
            difficulty: 'EASY',
            options: [
                { text: 'Aldehyde', isCorrect: true },
                { text: 'Ketone', isCorrect: false },
                { text: 'Carboxylic acid', isCorrect: false },
                { text: 'Ester', isCorrect: false }
            ],
            explanation: 'Glucose is an aldohexose (contains -CHO group).'
        },
        {
            text: 'Vitamin B12 contains which metal ion?',
            topic: 'Biomolecules',
            difficulty: 'MEDIUM',
            options: [
                { text: 'Cobalt', isCorrect: true },
                { text: 'Iron', isCorrect: false },
                { text: 'Zinc', isCorrect: false },
                { text: 'Magnesium', isCorrect: false }
            ],
            explanation: 'Vitamin B12 is also known as Cyanocobalamin.'
        },
        {
            text: 'Soluble component of starch is:',
            topic: 'Biomolecules',
            difficulty: 'HARD',
            options: [
                { text: 'Amylose', isCorrect: true },
                { text: 'Amylopectin', isCorrect: false },
                { text: 'Cellulose', isCorrect: false },
                { text: 'Glycogen', isCorrect: false }
            ],
            explanation: 'Amylose is the water-soluble component (15-20%) of starch.'
        }
    ];

    let order = 1;
    for (const qData of questionsData) {
        // 1. Create Question
        const q = await prisma.question.create({
            data: {
                organizationId: org.id,
                content: { text: qData.text },
                type: 'MCQ_SINGLE',
                difficulty: qData.difficulty as any,
                status: 'APPROVED',
                explanation: qData.explanation,
                tags: {
                    create: [{ tagId: tagMap[qData.topic] }]
                },
                options: {
                    create: qData.options.map((opt, idx) => ({
                        text: opt.text,
                        isCorrect: opt.isCorrect,
                        order: idx
                    }))
                }
            }
        });

        // 2. Link to Exam
        await prisma.examQuestion.create({
            data: {
                examId: chemistryExam.id,
                questionId: q.id,
                order: order++,
                marks: qData.difficulty === 'HARD' ? 4 : (qData.difficulty === 'MEDIUM' ? 3 : 2),
                negativeMarks: qData.difficulty === 'HARD' ? 1 : 0
            }
        });
    }

    console.log(`Seeded ${questionsData.length} Real Organic Chemistry Questions.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
