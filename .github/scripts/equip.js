// Applies one "[Equip]" request: checks the player owns the cosmetic, then writes equips.json.
const fs = require('fs');

const COS = {
  time1: { g: 'time', lv: 1 },
  time2: { g: 'time', lv: 2 },
  time3: { g: 'time', lv: 3 },
  time4: { g: 'time', lv: 4 },
};
const norm = (id) => (id === 'time' ? 'time4' : id);
const lc = (s) => String(s).toLowerCase();

function done(ok, msg) {
  fs.writeFileSync('/tmp/result.txt', msg);
  if (!ok) fs.writeFileSync('/tmp/fail', '1');
  process.exit(0);
}

function owns(p, id) {
  const c = COS[norm(id)];
  if (!c) return false;
  let top = 0;
  for (const i of p.cos || []) {
    const x = COS[norm(i)];
    if (x && x.g === c.g && x.lv > top) top = x.lv;
  }
  return top >= c.lv;
}

const m = /BT1\.([A-Za-z0-9+\/=]+)/.exec(process.env.BODY || '');
if (!m) done(false, 'No request code found in this issue.');

let o;
try {
  o = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
} catch (e) {
  done(false, 'The request code is damaged.');
}
if (!o || o.type !== 'equip' || !/^\w{3,16}$/.test(String(o.me)) || typeof o.cos !== 'string') {
  done(false, 'That isn\u2019t an equip request.');
}
const cos = o.cos ? norm(o.cos) : '';
if (cos && !COS[cos]) done(false, 'Unknown cosmetic.');

let data;
try {
  data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
} catch (e) {
  done(false, 'Couldn\u2019t read data.json.');
}
const p = (data.P || []).find((x) => lc(x.name) === lc(o.me));
if (!p) done(false, 'No player called ' + o.me + ' in the list.');
if (cos && !owns(p, cos)) done(false, p.name + ' doesn\u2019t own that cosmetic yet.');

let eq = {};
try {
  eq = JSON.parse(fs.readFileSync('equips.json', 'utf8')) || {};
} catch (e) {}

const key = lc(p.name);
const login = process.env.LOGIN;
const cur = eq[key];
if (cur && cur.gh && lc(cur.gh) !== lc(login)) {
  done(false, p.name + ' is tied to another GitHub account (@' + cur.gh + '). Ask the owner to reset it.');
}
const other = Object.keys(eq).find((k) => k !== key && eq[k].gh && lc(eq[k].gh) === lc(login));
if (other) done(false, 'Your GitHub account is already tied to another player (' + other + ').');

eq[key] = { e: cos, t: Date.now(), gh: login };
fs.writeFileSync('equips.json', JSON.stringify(eq));
done(true, 'Done: ' + p.name + (cos ? ' now wears ' + cos : ' now wears nothing') + '. Everyone will see it in a few minutes.');
