import { writable } from 'svelte/store';

export interface NavState {
	isOpen: boolean;
	activeDropdown: string | null;
}

export interface NavStore {
	subscribe: (callback: (state: NavState) => void) => () => void;
	toggle: () => void;
	open: () => void;
	close: () => void;
	setActiveDropdown: (dropdownId: string) => void;
	toggleDropdown: (dropdownId: string) => void;
}

function createNavStore(): NavStore {
	const { subscribe, set, update } = writable<NavState>({
		isOpen: false,
		activeDropdown: null
	});

	return {
		subscribe,

		toggle: () => {
			update((state) => ({
				...state,
				isOpen: !state.isOpen
			}));
		},

		open: () => {
			update((state) => ({
				...state,
				isOpen: true
			}));
		},

		close: () => {
			set({
				isOpen: false,
				activeDropdown: null
			});
		},

		setActiveDropdown: (dropdownId: string) => {
			set({
				isOpen: true,
				activeDropdown: dropdownId
			});
		},

		toggleDropdown: (dropdownId: string) => {
			update((state) => {
				if (state.activeDropdown === dropdownId && state.isOpen) {
					return {
						isOpen: false,
						activeDropdown: null
					};
				} else {
					return {
						isOpen: true,
						activeDropdown: dropdownId
					};
				}
			});
		}
	};
}

export const navStore = createNavStore();
