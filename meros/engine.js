/*
 * Мерос ҳисоблаш механизми (Ўзбекистон Республикаси Фуқаролик кодекси, V бўлим, 1112–1157-моддалар).
 * Браузерда ва Node.js да ишлайди. Улушлар аниқ каср (BigInt) кўринишида ҳисобланади.
 */
(function (root) {
  'use strict';

  // ---------- Аниқ касрлар ----------
  function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { [a, b] = [b, a % b]; } return a || 1n; }
  class Q {
    constructor(n, d = 1n) {
      n = BigInt(n); d = BigInt(d);
      if (d === 0n) throw new Error('Нолга бўлиш');
      if (d < 0n) { n = -n; d = -d; }
      const g = gcd(n, d); this.n = n / g; this.d = d / g;
    }
    static of(x, y = 1) { return new Q(BigInt(x), BigInt(y)); }
    add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Q(this.n * o.n, this.d * o.d); }
    div(o) { return new Q(this.n * o.d, this.d * o.n); }
    cmp(o) { const x = this.n * o.d - o.n * this.d; return x > 0n ? 1 : x < 0n ? -1 : 0; }
    isZero() { return this.n === 0n; }
    num() { return Number(this.n) / Number(this.d); }
    toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  }
  const ZERO = Q.of(0), ONE = Q.of(1);
  const min = (a, b) => (a.cmp(b) <= 0 ? a : b);
  const sum = (arr) => arr.reduce((s, x) => s.add(x), ZERO);

  // ---------- Ёрдамчи ----------
  const alive = (p) => p && p.status !== 'dead';
  const eligible = (p) => alive(p) && !p.unworthy && !p.refused;
  const nm = (p, fb) => (p && p.name && p.name.trim()) || fb;

  const QUEUE_ART = { 1: '1135', 2: '1136', 3: '1137', 4: '1138', 5: '1139' };
  const QUEUE_NAME = {
    1: 'Биринчи навбат', 2: 'Иккинчи навбат', 3: 'Учинчи навбат', 4: 'Тўртинчи навбат', 5: 'Бешинчи навбат',
  };
  function descName(level) { return ['фарзанд', 'невара', 'чевара', 'эвара'][level] || `${level + 1}-авлод авлоди`; }

  /**
   * Тақдим этиш ҳуқуқи бўйича «шох» (stirp) қуриш, 1140-модда.
   * depth — пастга тушиш мумкин бўлган даражалар сони (тўғри чизиқда чексиз, ён чизиқда 1).
   */
  function stirp(p, depth, ctx) {
    if (alive(p)) {
      if (eligible(p)) return { leaf: p, ctx };
      return null; // номуносиб ёки воз кечган — улуши 1154-м. бўйича бошқаларга ўтади
    }
    if (depth <= 0) return null;
    const subs = (p.kids || [])
      .map((k) => stirp(k, depth - 1, { ...ctx, level: ctx.level + 1, via: [...ctx.via, nm(p, ctx.label)] }))
      .filter(Boolean);
    return subs.length ? { subs } : null;
  }
  function spread(tree, share, out) {
    if (tree.leaf) { out.push({ person: tree.leaf, share, ctx: tree.ctx }); return; }
    const each = share.div(Q.of(tree.subs.length));
    tree.subs.forEach((t) => spread(t, each, out));
  }

  /** Навбат бўйича меросхўрлар бирликларини қайтаради: [{tree}] */
  function queueUnits(c, q) {
    const units = [];
    const mk = (p, rel, art, depth, label, sideRel) => {
      const t = stirp(p, depth, { rel, art, level: 0, via: [], label, sideRel, queue: q });
      if (t) units.push(t);
    };
    if (q === 1) {
      const s = c.spouse;
      if (s && s.present && s.registered !== false && eligible(s)) units.push({ leaf: s, ctx: { rel: 'Эр (хотин)', art: '1135', level: 0, via: [], queue: 1 } });
      (c.parents || []).forEach((p) => { if (!p.bioOfAdopted) mk(p, p.role === 'father' ? 'Ота' : 'Она', '1135', 0, 'Ота-она'); });
      (c.children || []).forEach((p) => mk(p, 'Фарзанд', '1135', 99, 'Фарзанд', 'direct'));
    } else if (q === 2) {
      (c.siblings || []).forEach((p) => mk(p, p.half ? 'Ака-ука/опа-сингил (ўгай)' : 'Ака-ука/опа-сингил', '1136', 1, 'Ака-ука/опа-сингил', 'nephew'));
      (c.grandparents || []).forEach((p) => mk(p, 'Бобо/буви', '1136', 0, 'Бобо/буви'));
    } else if (q === 3) {
      (c.uncles || []).forEach((p) => mk(p, 'Амаки/тоға/амма/хола', '1137', 1, 'Амаки/тоға/амма/хола', 'cousin'));
    } else if (q === 4) {
      const cand = (c.others || []).filter(eligible).filter((p) => +p.degree >= 3 && +p.degree <= 6);
      if (cand.length) {
        const best = Math.min(...cand.map((p) => +p.degree));
        cand.filter((p) => +p.degree === best).forEach((p) => units.push({ leaf: p, ctx: { rel: `Қариндош (${best}-даража)`, art: '1138', level: 0, via: [], queue: 4 } }));
      }
    }
    return units;
  }

  function leafRel(ctx) {
    if (ctx.level === 0) return ctx.rel;
    if (ctx.sideRel === 'nephew') return 'Жиян (ака-ука/опа-сингилнинг фарзанди)';
    if (ctx.sideRel === 'cousin') return 'Амакивачча/тоғавачча/аммавачча/холавачча';
    return descName(ctx.level).replace(/^./, (x) => x.toUpperCase());
  }

  /** Барча шахсларни рўйхат кўринишида (истисно сабабларини кўрсатиш учун) */
  function allPersons(c) {
    const out = [];
    const walk = (p, group, q, level, sideRel) => {
      out.push({ p, group, q, level, sideRel });
      (p.kids || []).forEach((k) => walk(k, group, q, level + 1, sideRel));
    };
    if (c.spouse && c.spouse.present) out.push({ p: c.spouse, group: 'spouse', q: 1, level: 0 });
    (c.parents || []).forEach((p) => out.push({ p, group: 'parent', q: 1, level: 0 }));
    (c.children || []).forEach((p) => walk(p, 'child', 1, 0, 'direct'));
    (c.siblings || []).forEach((p) => walk(p, 'sibling', 2, 0, 'nephew'));
    (c.grandparents || []).forEach((p) => out.push({ p, group: 'grand', q: 2, level: 0 }));
    (c.uncles || []).forEach((p) => walk(p, 'uncle', 3, 0, 'cousin'));
    (c.others || []).forEach((p) => out.push({ p, group: 'other', q: 4, level: 0 }));
    (c.dependents || []).forEach((p) => out.push({ p, group: 'dep', q: 5, level: 0 }));
    return out;
  }

  /**
   * Қонун бўйича мерос (68-боб). Натижа: {queue, rows:[{person, share, rel, basis, arts[]}], notes[]}
   * frac — тақсимланаётган қисм (масалан, васият қилинмаган қисм, 1123-модда).
   */
  function intestate(c, frac = ONE) {
    const notes = [];
    let queue = 0, units = [];
    for (let q = 1; q <= 4; q++) { units = queueUnits(c, q); if (units.length) { queue = q; break; } }

    // 1141-модда: меҳнатга лаёқатсиз қарамоғидагилар
    const deps = [];
    const depBasis1 = (p) => p.disabled && p.dependent && p.cohabited;
    if (queue) {
      (c.dependents || []).filter(eligible).forEach((p) => {
        if (depBasis1(p)) deps.push({ person: p, rel: 'Меҳнатга лаёқатсиз қарамоғидаги шахс', part: 1 });
      });
      // 2-қисм: 1136–1138-моддаларда кўрсатилган, лекин чақирилмаган навбатдаги қариндошлар
      allPersons(c).forEach(({ p, group, q, level, sideRel }) => {
        if (q <= queue || q > 4 || group === 'dep') return;
        if (!eligible(p) || !p.disabled || !p.dependent) return;
        if (q === 4 && !(+p.degree >= 3 && +p.degree <= 6)) return;
        const rel = level === 0 ? ({ sibling: 'Ака-ука/опа-сингил', grand: 'Бобо/буви', uncle: 'Амаки/тоға/амма/хола', other: `Қариндош (${p.degree}-даража)` }[group])
          : leafRel({ level, sideRel });
        deps.push({ person: p, rel: `${rel} — меҳнатга лаёқатсиз қарамоғидаги`, part: 2 });
      });
    }

    const rows = [];
    if (queue) {
      const n = units.length, d = deps.length;
      let unitShare = ONE.div(Q.of(n + d)), depShare = d ? ONE.div(Q.of(n + d)) : ZERO;
      if (d && depShare.mul(Q.of(d)).cmp(Q.of(1, 4)) > 0) {
        depShare = Q.of(1, 4).div(Q.of(d));
        unitShare = Q.of(3, 4).div(Q.of(n));
        notes.push('Қарамоғидаги шахслар биргаликда мероснинг 1/4 қисмидан ортиқ олмайди (1141-модда 3-қисми) — улушлар шунга мувофиқ чекланди.');
      }
      const leaves = [];
      units.forEach((u) => spread(u, unitShare, leaves));
      leaves.forEach(({ person, share, ctx }) => {
        const repr = ctx.level > 0;
        rows.push({
          person, share: share.mul(frac), rel: leafRel(ctx),
          basis: `Қонун бўйича, ${QUEUE_NAME[queue].toLowerCase()}${repr ? ', тақдим этиш ҳуқуқи бўйича (' + ctx.via.join(' → ') + ' ўрнига)' : ''}`,
          arts: [QUEUE_ART[queue], ...(repr ? ['1140'] : [])],
        });
      });
      deps.forEach(({ person, rel, part }) => rows.push({
        person, share: depShare.mul(frac), rel,
        basis: `Қонун бўйича, ${QUEUE_NAME[queue].toLowerCase()} меросхўрлари билан бирга (1141-м. ${part}-қисми)`,
        arts: ['1141'],
      }));
    } else {
      // 5-навбат: 1141-модда бўйича мерос олмайдиган меҳнатга лаёқатсиз қарамоғидагилар, 1139-модда
      const d5 = (c.dependents || []).filter(eligible).filter((p) => p.disabled && p.dependent);
      if (d5.length) {
        queue = 5;
        const each = ONE.div(Q.of(d5.length));
        d5.forEach((p) => rows.push({ person: p, share: each.mul(frac), rel: 'Меҳнатга лаёқатсиз қарамоғидаги шахс', basis: 'Қонун бўйича, бешинчи навбат', arts: ['1139'] }));
      }
    }
    return { queue, rows, notes };
  }

  /** Мажбурий улушга ҳақли шахслар, 1142-модда */
  function obligatoryHeirs(c) {
    const res = [];
    (c.children || []).forEach((p) => { if (eligible(p) && (p.minor || p.disabled)) res.push(p); });
    if (c.spouse && c.spouse.present && c.spouse.registered !== false && eligible(c.spouse) && c.spouse.disabled) res.push(c.spouse);
    (c.parents || []).forEach((p) => { if (!p.bioOfAdopted && eligible(p) && p.disabled) res.push(p); });
    return res;
  }

  /**
   * Асосий ҳисоб.
   * c = { deceased, estate:{personal, joint}, spouse, parents[], children[], siblings[], grandparents[], uncles[], others[], dependents[], will:{exists, entries:[{id,name,percent,personId,refused,unworthy,dead}]} }
   */
  function compute(c) {
    const notes = [], warnings = [];
    const owners = new Map(); // key -> {key, person, name, rel, parts:[{type, share, basis, arts}]}
    const keyOf = (p) => p.id;
    const add = (person, name, rel, type, share, basis, arts) => {
      if (share.isZero()) return;
      const k = keyOf(person);
      if (!owners.has(k)) owners.set(k, { key: k, person, name, rel, parts: [] });
      const o = owners.get(k);
      if (rel && o.rel && !o.rel.includes(rel) && type === 'law') o.rel = `${o.rel}; ${rel}`;
      if (!o.rel) o.rel = rel;
      o.parts.push({ type, share, basis, arts });
    };

    // Эр-хотиннинг умумий мулки, 1114-модда
    const personal = +((c.estate && c.estate.personal) || 0), joint = +((c.estate && c.estate.joint) || 0);
    const spouseAlive = c.spouse && c.spouse.present && alive(c.spouse);
    const spouseHalf = spouseAlive ? joint / 2 : 0;
    const estateValue = personal + joint - spouseHalf;
    if (spouseAlive && joint > 0) {
      notes.push(`Эр-хотиннинг умумий биргаликдаги мулкидан тирик қолган эр (хотин)нинг ½ улуши (${fmtMoney(spouseHalf)}) мерос таркибига кирмайди ва унга мерос сифатида эмас, мулкдор сифатида тегишли (ФК 1114, 1143-моддалари; Оила кодекси 23-моддаси).`);
    }

    const base = intestate(c, ONE); // васиятсиз ҳолатдаги қонун бўйича улушлар (мажбурий улуш учун ҳам)
    const lawShare = new Map(base.rows.map((r) => [keyOf(r.person), r.share]));

    const will = c.will || {};
    const entries = will.exists ? (will.entries || []).filter((e) => +e.percent > 0) : [];
    let willed = ZERO;
    const findPerson = (id) => allPersons(c).map((x) => x.p).find((p) => p.id === id);

    if (entries.length) {
      const totalPct = entries.reduce((s, e) => s + +e.percent, 0);
      if (totalPct > 100.0001) warnings.push(`Васиятдаги улушлар йиғиндиси ${totalPct}% — 100% дан ортиқ. Ҳисоб учун улушлар мутаносиб равишда камайтирилди.`);
      const scale = totalPct > 100 ? 100 / totalPct : 1;
      const raw = entries.map((e) => {
        const linked = e.personId ? findPerson(e.personId) : null;
        const ent = linked ? { ...e, person: linked } : { ...e, person: { id: e.id, name: e.name, status: e.dead ? 'dead' : 'alive', refused: e.refused, unworthy: e.unworthy } };
        return { ...ent, share: Q.of(Math.round(+e.percent * scale * 1000), 100000) };
      });
      willed = sum(raw.map((r) => r.share));
      if (willed.cmp(ONE) > 0) willed = ONE;
      const ok = raw.filter((r) => eligible(r.person));
      const failed = raw.filter((r) => !eligible(r.person));
      const wholeWilled = willed.cmp(ONE) === 0;
      let accrued = ZERO;
      failed.forEach((r) => {
        const why = !alive(r.person) ? 'мерос очилгунга қадар вафот этган' : r.person.unworthy ? 'номуносиб меросхўр (1119-м.)' : 'меросдан воз кечган (1147-м.)';
        warnings.push(`Васият бўйича меросхўр «${nm(r.person, r.name)}» ${why}: унга васият қилинган ${r.share} улуш ${wholeWilled && ok.length ? 'бошқа васият бўйича меросхўрларга мутаносиб равишда ўтади (1154-м. 2-қисми)' : 'қонун бўйича меросхўрларга ўтади (1123, 1154-м.)'}. Агар васиятда қўшимча меросхўр тайинланган бўлса (1122-м.), натижани қўлда тузатинг.`);
        accrued = accrued.add(r.share);
      });
      const okTotal = sum(ok.map((r) => r.share));
      ok.forEach((r) => {
        let s = r.share;
        if (wholeWilled && ok.length && !accrued.isZero()) s = s.add(accrued.mul(r.share).div(okTotal));
        add(r.person, nm(r.person, r.name), r.personId ? relOf(c, r.person) : 'Васият бўйича меросхўр', 'will', s, 'Васият бўйича', ['1120']);
      });
      if (!(wholeWilled && ok.length)) willed = okTotal;
    }

    const rest = ONE.sub(willed);
    let lawResult = { queue: 0, rows: [], notes: [] };
    if (!rest.isZero()) {
      lawResult = intestate(c, rest);
      lawResult.rows.forEach((r) => add(r.person, nm(r.person, r.rel), r.rel, 'law',
        r.share, entries.length ? `${r.basis}; васият қилинмаган қисмдан (1123-м.)` : r.basis, entries.length ? [...r.arts, '1123'] : r.arts));
      notes.push(...lawResult.notes);
    }

    // Мажбурий улуш, 1142-модда
    const obl = [];
    if (entries.length) {
      const floors = new Map();
      obligatoryHeirs(c).forEach((p) => {
        const ls = lawShare.get(keyOf(p)) || ZERO;
        const ob = ls.mul(Q.of(1, 2));
        floors.set(keyOf(p), ob);
        obl.push({ person: p, lawShare: ls, ob });
      });
      const totalOf = (k) => (owners.has(k) ? sum(owners.get(k).parts.map((x) => x.share)) : ZERO);
      const deficits = obl.map((o) => ({ ...o, need: o.ob.sub(totalOf(keyOf(o.person))) })).filter((o) => o.need.cmp(ZERO) > 0);
      let need = sum(deficits.map((d) => d.need));
      if (!need.isZero()) {
        // Аввал васият қилинмаган қисмдан, сўнгра васият қилинган қисмдан, мутаносиб равишда.
        for (const type of ['law', 'will']) {
          if (need.isZero()) break;
          const caps = [];
          owners.forEach((o, k) => {
            const floor = floors.get(k) || ZERO;
            const tot = totalOf(k);
            const room = tot.sub(floor);
            if (room.cmp(ZERO) <= 0) return;
            const typed = sum(o.parts.filter((x) => x.type === type).map((x) => x.share));
            const cap = min(typed, room);
            if (cap.cmp(ZERO) > 0) caps.push({ o, cap });
          });
          const capTot = sum(caps.map((x) => x.cap));
          if (capTot.isZero()) continue;
          const take = min(need, capTot);
          caps.forEach(({ o, cap }) => {
            const t = cap.mul(take).div(capTot);
            o.parts.push({ type, share: ZERO.sub(t), basis: 'Мажбурий улуш ҳисобига камайтирилди', arts: ['1142'] });
          });
          need = need.sub(take);
        }
        const covered = sum(deficits.map((d) => d.need)).sub(need);
        const totNeed = sum(deficits.map((d) => d.need));
        deficits.forEach((d) => {
          const give = d.need.mul(covered).div(totNeed);
          add(d.person, nm(d.person, relOf(c, d.person)), relOf(c, d.person), 'obl', give,
            `Мажбурий улуш: қонун бўйича улушнинг (${d.lawShare}) камида ярми`, ['1142']);
        });
        notes.push('Мажбурий улуш аввал васият қилинмаган мол-мулкдан, у етмаганда васият қилинган мол-мулкдан мутаносиб равишда қопланди. ФК 1142-моддасида манба тартиби тўғридан-тўғри белгиланмаган — бу услубий ёндашув, суд амалиётига қараб текширинг.');
      }
    }

    // Натижа жадвали
    const heirs = [...owners.values()].map((o) => {
      const total = sum(o.parts.map((x) => x.share));
      const arts = [...new Set(o.parts.flatMap((x) => x.arts))].sort();
      return { name: o.name, rel: o.rel, total, parts: o.parts, arts, value: estateValue ? total.num() * estateValue : null, obligatory: obl.some((x) => keyOf(x.person) === o.key) };
    }).filter((h) => h.total.cmp(ZERO) > 0).sort((a, b) => b.total.cmp(a.total));

    // Истисно қилинганлар
    const heirKeys = new Set([...owners.keys()]);
    const excluded = [];
    allPersons(c).forEach(({ p, group, q, level }) => {
      if (heirKeys.has(p.id)) return;
      const label = nm(p, group === 'parent' ? (p.role === 'father' ? 'Ота' : 'Она') : groupLabel(group, level));
      let why = null;
      if (group === 'spouse' && p.registered === false) why = 'Никоҳ ФҲДЁ органларида қайд этилмаган — эр (хотин) сифатида меросхўр эмас (Оила кодекси 13-моддаси).';
      else if (!alive(p) && ['child', 'sibling', 'uncle'].includes(group)) why = (p.kids || []).length ? 'Мерос очилгунга қадар вафот этган — улуши авлодларига тақдим этиш ҳуқуқи бўйича ўтади (1140-м.).' : 'Мерос очилгунга қадар вафот этган, тақдим этиш ҳуқуқига эга авлодлари кўрсатилмаган (1118, 1140-м.).';
      else if (!alive(p)) why = 'Мерос очилгунга қадар вафот этган (1118-м.).';
      else if (p.unworthy) why = `Номуносиб меросхўр${p.unworthyReason ? ' (' + p.unworthyReason + ')' : ''} — мерос олишдан четлатилади (1119-м.). Асос суд томонидан аниқланиши керак.`;
      else if (p.refused) why = 'Меросдан воз кечган (1147-м.) — улуши бошқа меросхўрларга ўтади (1154-м.).';
      else if (group === 'parent' && p.bioOfAdopted) why = 'Мерос қолдирувчи фарзандликка олинган — қон-қариндош ота-она қонун бўйича меросхўр эмас (1134-м.).';
      else if (group === 'dep' && !(p.disabled && p.dependent)) why = 'Меҳнатга лаёқатсизлик ва камида бир йил қарамоқда бўлиш шартлари бажарилмаган (1141-м.).';
      else if (group === 'dep' && !p.cohabited && lawResult.queue && lawResult.queue < 5) why = 'Бирга яшаш шарти бажарилмаган (1141-м. 1-қисми).';
      else if (group === 'other' && !(+p.degree >= 3 && +p.degree <= 6)) why = 'Қариндошлик даражаси 3–6 оралиғида эмас (1138-м.).';
      else if (level > 0 && (group === 'sibling' || group === 'uncle') && level > 1) why = 'Ён чизиқда тақдим этиш ҳуқуқи фақат жиянлар ва амакиваччаларга тегишли (1140-м.).';
      else if (base.queue && q > base.queue && q <= 4) why = `${q}-навбат меросхўри: олдинги (${base.queue}-) навбат меросхўрлари мавжуд (1134-м.).`;
      else if (level > 0) why = 'Ота-онаси (тегишли аждоди) тирик ёки мерос олишдан четлатилган — тақдим этиш ҳуқуқи фақат мерос очилгунга қадар вафот этган меросхўрнинг авлодларига тегишли (1140-м.).';
      else if (entries.length) why = 'Мол-мулк тўлиқ васият қилинган, мажбурий улушга ҳақли эмас.';
      else if (group === 'other') why = 'Яқинроқ даражадаги қариндош мавжуд (1138-м.).';
      else why = 'Меросхўрлар қаторига кирмади.';
      excluded.push({ name: label, why });
    });

    if (!heirs.length) warnings.push('Меросхўрлар аниқланмади. Мол-мулк суд қарори билан эгасиз деб топилиб, фуқаролар ўзини ўзи бошқариш органи мулкига (у рад этса — давлат мулкига) ўтади (1157-м.).');
    const total = sum(heirs.map((h) => h.total));
    return { heirs, excluded, notes, warnings, queue: lawResult.queue || (entries.length ? 0 : base.queue), baseQueue: base.queue, estateValue, spouseHalf, total, willed, obl };
  }

  function groupLabel(g, level) {
    return ({ spouse: 'Эр (хотин)', parent: 'Ота/она', child: level ? descName(level) : 'Фарзанд', sibling: level ? 'Жиян' : 'Ака-ука/опа-сингил', grand: 'Бобо/буви', uncle: level ? 'Амакивачча' : 'Амаки/тоға/амма/хола', other: 'Қариндош', dep: 'Қарамоғидаги шахс' })[g] || 'Шахс';
  }
  function relOf(c, p) {
    const x = allPersons(c).find((y) => y.p === p);
    if (!x) return 'Шахс';
    if (x.group === 'parent') return p.role === 'father' ? 'Ота' : 'Она';
    if (x.level > 0) return leafRel({ level: x.level, sideRel: x.sideRel });
    return groupLabel(x.group, 0);
  }
  function fmtMoney(v) { return Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ') + ' сўм'; }

  root.Meros = { Q, compute, intestate, obligatoryHeirs, fmtMoney };
})(typeof window !== 'undefined' ? window : globalThis);
