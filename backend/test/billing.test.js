// SCRUM-29: billing rule boundary tests (success criterion SC1).
// Minimum one block; after that a partial 15-minute block counts only from 5 minutes.
const { expect } = require('chai');
const { billableBlocks, totalWorkedMs, calculateCost } = require('../utils/billing');

const minutes = (m) => m * 60 * 1000;
const at = (hhmm) => new Date(`2026-11-06T${hhmm}:00+10:00`);

describe('Billing rule: billable 15-minute blocks', () => {
    const cases = [
        // [minutes worked, expected blocks, reason]
        [0, 1, 'minimum charge'],
        [4, 1, 'minimum charge'],
        [15, 1, 'one full block'],
        [19, 1, '4 min into 2nd block: not charged'],
        [19.98, 1, 'just under 5 min into 2nd block: not charged'],
        [20, 2, '5 min into 2nd block: charged'],
        [31, 2, '1 min into 3rd block: not charged'],
        [34, 2, '4 min into 3rd block: not charged'],
        [35, 3, '5 min into 3rd block: charged'],
        [64, 4, '4 min into 5th block: not charged'],
        [65, 5, '5 min into 5th block: charged'],
        [74, 5, 'Figma Job review example'],
    ];

    cases.forEach(([worked, expected, reason]) => {
        it(`${worked} min -> ${expected} block(s) (${reason})`, () => {
            expect(billableBlocks(minutes(worked))).to.equal(expected);
        });
    });
});

describe('Billing rule: applied to the total across segments', () => {
    it('adds segments together, ignoring the stopped gap between them', () => {
        const segments = [
            { start: at('09:00'), end: at('09:50') },
            { start: at('10:10'), end: at('10:34') },
        ];
        expect(totalWorkedMs(segments)).to.equal(minutes(74));
    });

    it('applies the rule once to the total, not to each segment', () => {
        // Two 20-minute segments = 40 minutes = 2 full blocks + 10 min -> 3 blocks.
        // (Per segment it would be 2 + 2 = 4 blocks, overcharging the customer.)
        const segments = [
            { start: at('09:00'), end: at('09:20') },
            { start: at('10:00'), end: at('10:20') },
        ];
        expect(billableBlocks(totalWorkedMs(segments))).to.equal(3);
    });

    it('counts an open segment up to the current time', () => {
        const segments = [{ start: at('09:00'), end: null }];
        expect(totalWorkedMs(segments, at('09:30'))).to.equal(minutes(30));
    });
});

describe('Billing rule: total cost', () => {
    it('charges call-out fee + blocks x labour rate (Figma example: $250.00)', () => {
        const job = {
            calloutFee: 100,
            labourRate: 30,
            timeSegments: [
                { start: at('09:00'), end: at('09:50') },
                { start: at('10:10'), end: at('10:34') },
            ],
        };
        expect(calculateCost(job)).to.deep.equal({
            totalMinutes: 74,
            billableBlocks: 5,
            calloutFee: 100,
            labourRate: 30,
            labourCost: 150,
            totalCost: 250,
        });
    });

    it('rounds to cents', () => {
        const job = { calloutFee: 80.1, labourRate: 33.335, timeSegments: [{ start: at('09:00'), end: at('09:15') }] };
        expect(calculateCost(job).totalCost).to.equal(113.44);
    });
});