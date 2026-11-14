// One test case shared by every payload. The template owns the carry-forward
// values. This test owns the page plan: it measures the page chrome from a page
// that fits, packs every row in one pass, and returns one pageSizes patch.

// Build one index instead of running a full-document query for every selector.
// On a 500-row invoice the repeated selector scans are slower than the solver.
const index = {
  pages: [],
  items: [],
  tables: [],
  tableHeads: [],
  fullHeaders: [],
  continuationHeaders: [],
  intros: [],
  rows: [],
  carried: [],
  brought: [],
  totals: [],
  payments: [],
  summaries: [],
  footers: []
};

for (let i = 0; i < doc.nodes.length; i += 1) {
  const node = doc.nodes[i];
  const attrs = node.attributes || {};
  const className = attrs.class ? String(attrs.class) : '';
  const classes = className ? className.split(/\s+/) : [];

  if (node.tag_name === 'main' && classes.indexOf('page') !== -1) {
    index.pages.push(node);
  }
  if (node.tag_name === 'section' && classes.indexOf('items') !== -1) {
    index.items.push(node);
  }
  if (node.tag_name === 'table' && classes.indexOf('items-table') !== -1) {
    index.tables.push(node);
  }
  if (node.tag_name === 'thead') {
    index.tableHeads.push(node);
  }
  if (classes.indexOf('invoice-header') !== -1) {
    index.fullHeaders.push(node);
  }
  if (classes.indexOf('continuation-header') !== -1) {
    index.continuationHeaders.push(node);
  }
  if (classes.indexOf('parties') !== -1) {
    index.intros.push(node);
  }
  if (node.tag_name === 'tr' && classes.indexOf('item-row') !== -1) {
    index.rows.push(node);
  }
  if (attrs['data-role'] === 'carried-forward') {
    index.carried.push(node);
  }
  if (attrs['data-role'] === 'brought-forward') {
    index.brought.push(node);
  }
  if (attrs['data-testid'] === 'totals') {
    index.totals.push(node);
  }
  if (attrs['data-testid'] === 'payment') {
    index.payments.push(node);
  }
  if (classes.indexOf('invoice-summary') !== -1) {
    index.summaries.push(node);
  }
  if (classes.indexOf('footer') !== -1) {
    index.footers.push(node);
  }
}

const page = index.pages[0];
const pageBudget =
  page && page.attributes && page.attributes['data-page-budget']
    ? parseInt(page.attributes['data-page-budget'], 10)
    : 0;
const pageSizes =
  page && page.attributes && page.attributes['data-page-sizes']
    ? page.attributes['data-page-sizes'].split(',').map(Number)
    : [];
const measurePass =
  page && page.attributes && page.attributes['data-measure-pass']
    ? parseInt(page.attributes['data-measure-pass'], 10)
    : 0;
const probePass =
  page && page.attributes && page.attributes['data-probe-pass']
    ? parseInt(page.attributes['data-probe-pass'], 10)
    : 0;
const rows = index.rows;
const carried = index.carried;
const brought = index.brought;
const totals = index.totals[0];
const payment = index.payments[0];
const summary = index.summaries[0];
const footers = index.footers;
const footer = footers[footers.length - 1];
const lastRow = rows[rows.length - 1];
const renderedPageCount = index.pages.length;

function sameSizes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function pageNumberForNode(node) {
  let current = node;
  while (current) {
    if (current.attributes && current.attributes['data-page']) {
      return parseInt(current.attributes['data-page'], 10);
    }
    current = current.parentNode;
  }
  return null;
}

function findByPage(nodes, pageNumber) {
  for (let i = 0; i < nodes.length; i += 1) {
    if (pageNumberForNode(nodes[i]) === pageNumber) return nodes[i];
  }
  return null;
}

let measureError = '';

function measurePageSizes() {
  measureError = '';
  const pageNodes = index.pages;
  const itemsSections = index.items;
  const tables = index.tables;
  const tableHeads = index.tableHeads;
  const fullHeader = index.fullHeaders[0];
  const continuationHeaders = index.continuationHeaders;
  const intro = index.intros[0];

  if (
    !pageNodes.length ||
    !itemsSections.length ||
    !tables.length ||
    !tableHeads.length ||
    !fullHeader ||
    !intro ||
    !totals ||
    !payment
  ) {
    measureError = 'missing measure anchors';
    return null;
  }

  // A page that fits on one physical page gives exact chrome measurements.
  // Pages that overflow have a multi-page bounding box and must not be used.
  let fitIndex = -1;
  for (let i = 0; i < pageNodes.length; i += 1) {
    if (pageNodes[i].pages && pageNodes[i].pages.length === 1) {
      fitIndex = i;
      break;
    }
  }

  if (fitIndex < 0) {
    measureError = 'no fitting page';
    return null;
  }

  const fitPage = pageNodes[fitIndex];
  const fitPageNumber = parseInt(fitPage.attributes['data-page'], 10);
  const fitItems = findByPage(itemsSections, fitPageNumber);
  const fitTable = findByPage(tables, fitPageNumber);
  const fitHead = findByPage(tableHeads, fitPageNumber);
  const fitFooter = findByPage(footers, fitPageNumber);
  const fitHeader =
    fitPageNumber === 1
      ? fullHeader
      : findByPage(continuationHeaders, fitPageNumber);

  if (
    !fitItems ||
    !fitItems.geometry ||
    !fitTable ||
    !fitTable.geometry ||
    !fitHead ||
    !fitHead.geometry ||
    !fitFooter ||
    !fitFooter.geometry ||
    !fitHeader ||
    !fitHeader.geometry
  ) {
    measureError = 'missing fitting page geometry';
    return null;
  }

  const pageHeight = doc.printableHeight;
  const paddingTop = Math.max(
    0,
    pageHeight - (fitHeader.geometry.y + fitHeader.geometry.height)
  );
  const paddingBottom = Math.max(0, fitFooter.geometry.y);
  const footerRowHeight = fitItems.geometry.y - paddingBottom;
  const itemsPaddingTop =
    fitItems.geometry.y +
    fitItems.geometry.height -
    (fitTable.geometry.y + fitTable.geometry.height);
  const tableHeaderHeight = fitHead.geometry.height;

  if (
    !pageHeight ||
    footerRowHeight <= 0 ||
    itemsPaddingTop < 0 ||
    tableHeaderHeight <= 0
  ) {
    measureError = 'invalid page chrome';
    return null;
  }

  const fullHeaderHeight = fullHeader.geometry.height;
  const introHeight = intro.geometry.height;
  const continuationHeader = continuationHeaders.length
    ? continuationHeaders[0]
    : null;

  if (!continuationHeader || !continuationHeader.geometry) {
    measureError = 'missing continuation header';
    return null;
  }

  const continuationHeaderHeight = continuationHeader.geometry.height;
  const summaryHeight =
    summary && summary.geometry
      ? summary.geometry.height
      : totals.geometry.height + payment.geometry.height;
  const broughtHeight =
    brought.length && brought[0].geometry ? brought[0].geometry.height : 0;
  const carryHeight =
    carried.length && carried[0].geometry ? carried[0].geometry.height : 0;

  if (summaryHeight <= 0) {
    measureError = 'invalid summary height';
    return null;
  }

  const contentHeight = pageHeight - paddingTop - paddingBottom;
  const firstItemsHeight =
    contentHeight - fullHeaderHeight - introHeight - footerRowHeight;
  const middleItemsHeight =
    contentHeight - continuationHeaderHeight - footerRowHeight;
  const lastItemsHeight = middleItemsHeight - summaryHeight;
  // Print tolerance in PDF points for rounded edges and collapsed borders.
  const SAFETY_POINTS = 8;

  const firstCapacity =
    firstItemsHeight -
    itemsPaddingTop -
    tableHeaderHeight -
    carryHeight -
    SAFETY_POINTS;
  const middleCapacity =
    middleItemsHeight -
    itemsPaddingTop -
    tableHeaderHeight -
    broughtHeight -
    carryHeight -
    SAFETY_POINTS;
  const lastCapacity =
    lastItemsHeight -
    itemsPaddingTop -
    tableHeaderHeight -
    broughtHeight -
    SAFETY_POINTS;
  const singleCapacity =
    contentHeight -
    fullHeaderHeight -
    introHeight -
    summaryHeight -
    footerRowHeight -
    itemsPaddingTop -
    tableHeaderHeight -
    SAFETY_POINTS;

  if (
    firstCapacity <= 0 ||
    middleCapacity <= 0 ||
    lastCapacity <= 0 ||
    singleCapacity <= 0
  ) {
    measureError = 'non-positive page capacity';
    return null;
  }

  // Measure row advances top-to-top on the same template page. This removes
  // the collapsed-border overlap from the individual row heights. At a page
  // boundary the next row is on a new page, so use the row height instead.
  let overlapSum = 0;
  let overlapCount = 0;
  for (let i = 0; i < rows.length - 1; i += 1) {
    const current = rows[i];
    const next = rows[i + 1];
    if (
      !current.geometry ||
      !next.geometry ||
      pageNumberForNode(current) !== pageNumberForNode(next)
    ) {
      continue;
    }
    const advance =
      current.geometry.y +
      current.geometry.height -
      (next.geometry.y + next.geometry.height);
    const overlap = current.geometry.height - advance;
    if (advance > 0 && overlap > 0 && overlap < 3) {
      overlapSum += overlap;
      overlapCount += 1;
    }
  }
  const borderOverlap = overlapCount ? overlapSum / overlapCount : 0.75;

  const rowHeights = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.geometry || !row.geometry.height) {
      measureError = 'missing row geometry';
      return null;
    }

    let advance = Math.max(0, row.geometry.height - borderOverlap);
    if (i + 1 < rows.length) {
      const next = rows[i + 1];
      if (
        next.geometry &&
        pageNumberForNode(row) === pageNumberForNode(next)
      ) {
        const delta =
          row.geometry.y +
          row.geometry.height -
          (next.geometry.y + next.geometry.height);
        if (delta > 0 && delta <= row.geometry.height + 2) {
          advance = delta;
        }
      }
    }
    rowHeights.push(advance);
  }

  function capacitiesFor(pageCount) {
    const capacities = [];
    for (let p = 0; p < pageCount; p += 1) {
      if (pageCount === 1) {
        capacities.push(singleCapacity);
      } else if (p === 0) {
        capacities.push(firstCapacity);
      } else if (p === pageCount - 1) {
        capacities.push(lastCapacity);
      } else {
        capacities.push(middleCapacity);
      }
    }
    return capacities;
  }

  function split(pageCount) {
    const capacities = capacitiesFor(pageCount);
    const totalRows = rowHeights.length;
    const sizes = new Array(pageCount).fill(0);

    if (pageCount === 1) {
      let used = 0;
      for (let i = 0; i < totalRows; i += 1) {
        used += rowHeights[i];
      }
      if (used > capacities[0]) return null;
      sizes[0] = totalRows;
      return sizes;
    }

    // minIndex[r] is the earliest row index that fits in the last r pages.
    // Filling backward once gives a suffix-feasibility table in linear time.
    const minIndex = new Array(pageCount).fill(totalRows);
    let index = totalRows;
    for (let r = 1; r <= pageCount - 1; r += 1) {
      const capacity =
        r === 1 ? capacities[pageCount - 1] : capacities[pageCount - 2];
      let used = 0;
      const start = index;
      while (index > 0) {
        const next = used + rowHeights[index - 1];
        if (next > capacity) break;
        used = next;
        index -= 1;
      }
      if (index === start) return null;
      minIndex[r] = index;
    }

    // Fill forward using the suffix table. This keeps the first page as full
    // as possible while still leaving a feasible suffix.
    let current = 0;
    let remainingPages = pageCount - 1;
    let capacity = capacities[0];
    let used = 0;
    let count = 0;
    while (current + count < totalRows - remainingPages) {
      const next = used + rowHeights[current + count];
      if (next > capacity) break;
      used = next;
      count += 1;
    }
    if (count === 0 || current + count < minIndex[remainingPages]) {
      return null;
    }
    sizes[0] = count;
    current += count;

    for (let p = 1; p <= pageCount - 2; p += 1) {
      remainingPages = pageCount - 1 - p;
      capacity = capacities[p];
      used = 0;
      count = 0;
      while (current + count < totalRows - remainingPages) {
        const next = used + rowHeights[current + count];
        if (next > capacity) break;
        used = next;
        count += 1;
      }
      if (count === 0 || current + count < minIndex[remainingPages]) {
        return null;
      }
      sizes[p] = count;
      current += count;
    }

    const lastCount = totalRows - current;
    if (lastCount <= 0) return null;
    used = 0;
    for (let i = current; i < totalRows; i += 1) {
      used += rowHeights[i];
    }
    if (used > capacities[pageCount - 1]) return null;
    sizes[pageCount - 1] = lastCount;
    return sizes;
  }

  for (let pageCount = 1; pageCount <= rowHeights.length; pageCount += 1) {
    const sizes = split(pageCount);
    if (sizes) return sizes;
  }

  measureError = 'no split found';
  return null;
}

if (!rows.length || !lastRow || !totals || !payment || !footer) {
  return { success: false, reason: 'Missing invoice layout anchors' };
}

const problems = [];

if (renderedPageCount !== pageSizes.length) {
  problems.push('Rendered page count does not match pageSizes');
}

if (carried.length !== brought.length) {
  problems.push('Carried/brought row count mismatch');
}

for (let i = 0; i < carried.length; i += 1) {
  if (carried[i].pages[0] + 1 !== brought[i].pages[0]) {
    problems.push('Carry row did not continue on the next page');
    break;
  }
}

const totalPages =
  Math.max(...doc.nodes.flatMap((node) => node.pages || []), -1) + 1;
const lastPage = lastRow.pages[lastRow.pages.length - 1];
const overBudget = pageBudget > 0 && totalPages > pageBudget;
const separated =
  totals.pages[0] !== lastPage ||
  payment.pages[0] !== lastPage ||
  footer.pages[footer.pages.length - 1] !== lastPage;
const broken = problems.length > 0 || overBudget || separated;

// A single-page seed that overflows has no continuation page to measure. Make
// one probe render with a continuation page; the next run calculates the final
// plan. This is one probe, not a page-by-page loop.
const continuationHeader = index.continuationHeaders[0];
if (
  broken &&
  !continuationHeader &&
  rows.length > 1 &&
  measurePass === 0 &&
  probePass === 0
) {
  return {
    reason: 'Forcing continuation geometry for one measurement',
    patch: {
      pageSizes: [1, rows.length - 1],
      probePass: 1
    }
  };
}

// A single-page render that already fits needs no patch.
if (!broken && pageSizes.length === 1 && measurePass === 0 && probePass === 0) {
  return {
    success: true,
    pageBudget: pageBudget > 0 ? pageBudget : totalPages,
    pageSizes: pageSizes,
    totalPages: totalPages,
    lineItems: rows.length,
    carriedRows: carried.length,
    broughtRows: brought.length
  };
}

if ((measurePass === 0 && probePass === 0) || probePass === 1) {
  const measured = measurePageSizes();

  if (!measured) {
    if (measureError === 'no fitting page' && measurePass === 0 && probePass === 0) {
      return {
        reason: 'Forcing a fitting page for measurement',
        patch: { pageSizes: [1, rows.length - 1], probePass: 1 }
      };
    }
    return {
      success: false,
      reason:
        'Measured pagination failed: ' +
        measureError +
        '; pageSizes=' +
        pageSizes.join(',') +
        '; totalPages=' +
        totalPages +
        '; measurePass=' +
        measurePass +
        '; probePass=' +
        probePass
    };
  }

  if (!sameSizes(measured, pageSizes)) {
    return {
      reason:
        probePass === 1
          ? 'Applied final page plan after probe'
          : 'Calculated all page sizes in one measurement',
      patch: {
        pageSizes: measured,
        measurePass: 1,
        probePass: 0
      }
    };
  }
}

if (broken) {
  return {
    success: false,
    reason:
      (measureError
        ? 'Measured pagination failed: ' + measureError
        : problems.length
          ? problems[0] + ' after measured patch'
          : overBudget
            ? 'Invoice still exceeds its page budget after measured patch'
            : 'Summary still broken after measured patch') +
      '; pageSizes=' +
      pageSizes.join(',') +
      '; totalPages=' +
      totalPages +
      '; measurePass=' +
      measurePass +
      '; probePass=' +
      probePass
  };
}

return {
  success: true,
  pageBudget: pageBudget > 0 ? pageBudget : totalPages,
  pageSizes: pageSizes,
  totalPages: totalPages,
  lineItems: rows.length,
  carriedRows: carried.length,
  broughtRows: brought.length
};
