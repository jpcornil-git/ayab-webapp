export type DialogField = {
    name: string;
    label: string;
    type: 'number' | 'select';
    value: string;
    min?: string;
    step?: string;
    options?: Array<{ value: string; label: string }>;
};

/**
 * Creates a modal form in the document (better than using prompt).
 * @param title The title of the form.
 * @param fields The fields to display in the form.
 * @returns A promise that resolves to an object containing the field values, or null if the form was cancelled.
 * @example
 * const result = await Dialog.showForm('Enter values', [
 *   { name: 'width', label: 'Width', type: 'number', value: '100', min: '1' },
 *   { name: 'height', label: 'Height', type: 'number', value: '100', min: '1' },
 *   { name: 'color', label: 'Color', type: 'select', value: 'red', options: [
 *     { value: 'red', label: 'Red' },
 *     { value: 'green', label: 'Green' },
 *     { value: 'blue', label: 'Blue' }
 *   ] }
 * ]);
 */
export class Dialog {
    public static showForm(title: string, fields: DialogField[]): Promise<Record<string, string> | null> {
        const dialog = document.createElement('dialog');
        dialog.className = 'app-dialog';

        const form = document.createElement('form');
        form.method = 'dialog';
        form.className = 'app-dialog-form';

        const heading = document.createElement('h2');
        heading.textContent = title;
        form.appendChild(heading);

        const controls = new Map<string, HTMLInputElement | HTMLSelectElement>();
        for (const field of fields) {
            const group = document.createElement('div');
            group.className = 'app-dialog-field';
            const label = document.createElement('label');
            label.textContent = field.label;

            const control = field.type === 'select'
                ? document.createElement('select')
                : document.createElement('input');
            control.name = field.name;
            control.value = field.value;
            if (field.type === 'number') {
                const numberControl = control as HTMLInputElement;
                numberControl.type = 'number';
                numberControl.min = field.min ?? '0.01';
                numberControl.step = field.step ?? 'any';
            } else {
                for (const option of field.options ?? []) {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.label;
                    control.appendChild(optionElement);
                }
            }
            label.htmlFor = `${field.name}-dialog-control`;
            control.id = label.htmlFor;
            group.append(label, control);
            form.appendChild(group);
            controls.set(field.name, control);
        }

        const actions = document.createElement('div');
        actions.className = 'app-dialog-actions';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        const apply = document.createElement('button');
        apply.type = 'submit';
        apply.textContent = 'Apply';
        actions.append(cancel, apply);
        form.appendChild(actions);
        dialog.appendChild(form);
        document.body.appendChild(dialog);

        return new Promise((resolve) => {
            let settled = false;
            const close = (result: Record<string, string> | null) => {
                if (settled) return;
                settled = true;
                if (dialog.open) dialog.close();
                dialog.remove();
                resolve(result);
            };

            cancel.addEventListener('click', () => close(null));
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const result: Record<string, string> = {};
                for (const [name, control] of controls) {
                    if (!control.value || (control instanceof HTMLInputElement && !control.checkValidity())) return;
                    result[name] = control.value;
                }
                close(result);
            });
            dialog.addEventListener('cancel', () => close(null), { once: true });
            dialog.showModal();
        });
    }
}
