/**
 * Counts the items of a list for the progress badge on the Home screen.
 *
 * A list is stored as one text with the rows separated by "|", and a checked row starts with
 * the ✔️ mark. A row counts as an item when it has text OR a picture (a picture on its own can
 * be a task). A row with neither is a spacer between sections and is not counted.
 *
 * `pictureRows` are the positions of the rows that have a picture (0 is the first row). Older
 * servers do not send them, so a missing list is treated as "no pictures".
 */
const CHECK_MARK = '✔️';

export interface ItemCount {
  done: number;
  total: number;
}

export function countItems(itemsText: string, pictureRows: number[] = []): ItemCount {
  let done = 0;
  let total = 0;
  itemsText.split('|').forEach((row, index) => {
    const isChecked = row.includes(CHECK_MARK);
    const hasText = row.split(CHECK_MARK).join('').trim() !== '';
    if (hasText || pictureRows.includes(index)) {
      total += 1;
      if (isChecked) done += 1;
    }
  });
  return { done, total };
}
