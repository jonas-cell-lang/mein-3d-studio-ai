const test = require('node:test');
const assert = require('node:assert/strict');
const { createHistory } = require('../src/history.js');

function makeHistory(options = {}) {
  let value = 0;
  let nextId = 1;
  const disposed = [];
  const history = createHistory({
    limit: options.limit,
    captureState: () => ({ id: nextId++, value }),
    restoreState: snapshot => {
      if (options.failValue === snapshot.value) throw new Error('simulierter Wiederherstellungsfehler');
      value = snapshot.value;
    },
    disposeState: snapshot => disposed.push(snapshot.id)
  });
  return {
    history,
    disposed,
    get value() { return value; },
    set value(next) { value = next; }
  };
}

test('Undo und Redo stellen den jeweils vorherigen Zustand wieder her', () => {
  const model = makeHistory();
  model.history.record();
  model.value = 1;
  model.history.record();
  model.value = 2;

  assert.equal(model.history.undo(), true);
  assert.equal(model.value, 1);
  assert.deepEqual(model.history.getStats(), { undoCount: 1, redoCount: 1, limit: 40, disposed: false });

  assert.equal(model.history.redo(), true);
  assert.equal(model.value, 2);
  assert.deepEqual(model.history.getStats(), { undoCount: 2, redoCount: 0, limit: 40, disposed: false });
});

test('Eine neue Änderung leert den Redo-Verlauf und gibt dessen Snapshots frei', () => {
  const model = makeHistory();
  model.history.record();
  model.value = 1;
  assert.equal(model.history.undo(), true);
  const disposedBeforeNewChange = model.disposed.length;

  model.history.record();
  assert.equal(model.history.getStats().redoCount, 0);
  assert.equal(model.disposed.length, disposedBeforeNewChange + 1);
});

test('Das Verlaufslimit gibt den ältesten Snapshot frei', () => {
  const model = makeHistory({ limit: 2 });
  model.history.record();
  model.value = 1;
  model.history.record();
  model.value = 2;
  model.history.record();
  model.value = 3;

  assert.equal(model.history.getStats().undoCount, 2);
  assert.equal(model.disposed.length, 1);
  assert.equal(model.history.undo(), true);
  assert.equal(model.value, 2);
  assert.equal(model.history.undo(), true);
  assert.equal(model.value, 1);
  assert.equal(model.history.undo(), false);
});

test('Ein fehlgeschlagenes Undo erhält den Snapshot und stellt den aktuellen Zustand wieder her', () => {
  const model = makeHistory({ failValue: 1 });
  model.history.record();
  model.value = 1;
  model.history.record();
  model.value = 2;

  assert.throws(() => model.history.undo(), /simulierter Wiederherstellungsfehler/);
  assert.equal(model.value, 2);
  assert.equal(model.history.getStats().undoCount, 2);
  assert.equal(model.history.getStats().redoCount, 0);
});

test('clear und dispose geben alle gehaltenen Snapshots frei', () => {
  const model = makeHistory();
  model.history.record();
  model.value = 1;
  model.history.record();
  model.value = 2;
  model.history.undo();

  model.history.clear();
  assert.deepEqual(model.history.getStats(), { undoCount: 0, redoCount: 0, limit: 40, disposed: false });

  model.history.record();
  model.history.dispose();
  assert.deepEqual(model.history.getStats(), { undoCount: 0, redoCount: 0, limit: 40, disposed: true });
  assert.equal(model.history.record(), false);
  assert.equal(model.history.undo(), false);
});

test('Ungültige History-Callbacks werden abgelehnt', () => {
  assert.throws(() => createHistory({}), /benötigt captureState/);
});

test('Ein fehlgeschlagenes Undo mit ebenfalls fehlschlagender Rücksicherung erhält beide Verlaufspunkte', () => {
  let value = 0;
  let failRestores = true;
  const history = createHistory({
    captureState: () => ({ value }),
    restoreState: snapshot => {
      value = snapshot.value;
      if (failRestores) throw new Error('simulierter Teil-Wiederherstellungsfehler');
    },
    disposeState: () => {}
  });

  history.record();
  value = 1;
  history.record();
  value = 2;

  assert.throws(() => history.undo(), error => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors.length, 2);
    assert.match(error.message, /Rückkehr zum vorherigen Zustand/);
    return true;
  });
  assert.equal(value, 2, 'Teilweise fehlgeschlagene Wiederherstellung darf den aktuellen Zustand nicht überschreiben');
  assert.deepEqual(history.getStats(), { undoCount: 2, redoCount: 1, limit: 40, disposed: false });

  failRestores = false;
  assert.equal(history.undo(), true, 'Der ursprüngliche Undo-Punkt muss nach dem Fehler erneut verwendbar sein');
  assert.equal(value, 1);
  assert.equal(history.redo(), true, 'Der vor dem Fehler aktive Zustand muss über Redo erreichbar bleiben');
  assert.equal(value, 2);
  history.dispose();
});


test('Undo und Redo blockieren verschachtelte Verlaufsaktionen während restoreState', () => {
  let value = 0;
  let history;
  let nestedResults = [];
  history = createHistory({
    captureState: () => ({ value }),
    restoreState: snapshot => {
      value = snapshot.value;
      nestedResults.push({
        undo: history.undo(),
        redo: history.redo(),
        record: history.record()
      });
    },
    disposeState: () => {}
  });

  history.record();
  value = 1;
  history.record();
  value = 2;

  assert.equal(history.undo(), true);
  assert.equal(value, 1);
  assert.deepEqual(nestedResults, [{ undo: false, redo: false, record: false }]);
  assert.deepEqual(history.getStats(), { undoCount: 1, redoCount: 1, limit: 40, disposed: false });

  assert.equal(history.redo(), true);
  assert.equal(value, 2);
  assert.deepEqual(nestedResults[1], { undo: false, redo: false, record: false });
  assert.deepEqual(history.getStats(), { undoCount: 2, redoCount: 0, limit: 40, disposed: false });
  history.dispose();
});


test('clear und dispose blockieren verschachtelte Aufrufe während restoreState', () => {
  let value = 0;
  let history;
  const nestedStats = [];
  history = createHistory({
    captureState: () => ({ value }),
    restoreState: snapshot => {
      value = snapshot.value;
      history.clear();
      history.dispose();
      nestedStats.push(history.getStats());
    },
    disposeState: () => {}
  });

  history.record();
  value = 1;
  history.record();
  value = 2;

  assert.equal(history.undo(), true);
  assert.equal(value, 1);
  assert.deepEqual(history.getStats(), { undoCount: 1, redoCount: 1, limit: 40, disposed: false });
  assert.deepEqual(nestedStats[0], { undoCount: 1, redoCount: 0, limit: 40, disposed: false });

  assert.equal(history.redo(), true);
  assert.equal(value, 2);
  assert.deepEqual(history.getStats(), { undoCount: 2, redoCount: 0, limit: 40, disposed: false });
  assert.deepEqual(nestedStats[1], { undoCount: 1, redoCount: 0, limit: 40, disposed: false });
  history.dispose();
  assert.equal(history.getStats().disposed, true);
});
