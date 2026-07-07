import type { PlatformId } from '@/types/platform';
import type { CopyResult } from '@/types/copy';

export interface AppState {
  input: {
    rawText: string;
    productName: string;
    targetAudience: string;
    keywords: string;
  };
  config: {
    platformId: PlatformId;
    toneStyle: string;
    maxLength: number;
    temperature: number;
  };
  result: {
    items: CopyResult[];
    generating: boolean;
    error: string | null;
  };
  key: {
    value: string;
    masked: string;
    isValid: boolean | null;
    validating: boolean;
  };
}

export const initialAppState: AppState = {
  input: { rawText: '', productName: '', targetAudience: '', keywords: '' },
  config: { platformId: 'xiaohongshu', toneStyle: '亲切闺蜜', maxLength: 500, temperature: 0.7 },
  result: { items: [], generating: false, error: null },
  key: { value: '', masked: '', isValid: null, validating: false },
};

export type AppAction =
  | { type: 'SET_INPUT'; payload: Partial<AppState['input']> }
  | { type: 'SET_CONFIG'; payload: Partial<AppState['config']> }
  | { type: 'RESULT_CLEAR' }
  | { type: 'RESULT_SET_GENERATING'; payload: boolean }
  | { type: 'RESULT_SET_ERROR'; payload: string | null }
  | { type: 'RESULT_ADD'; payload: CopyResult }
  | { type: 'RESULT_UPDATE'; payload: { id: string; content: string } }
  | { type: 'RESULT_DELETE'; payload: string }              // 新增：按 id 删单条
  | { type: 'RESULT_SET_ALL'; payload: CopyResult[] }        // 新增：批量设值（历史恢复/清空）
  | { type: 'KEY_SET'; payload: { value: string; masked: string } }
  | { type: 'KEY_SET_VALID'; payload: boolean | null }
  | { type: 'KEY_SET_VALIDATING'; payload: boolean }
  | { type: 'KEY_CLEAR' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: { ...state.input, ...action.payload } };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'RESULT_CLEAR':
      return { ...state, result: { ...state.result, items: [], error: null } };
    case 'RESULT_SET_GENERATING':
      return { ...state, result: { ...state.result, generating: action.payload } };
    case 'RESULT_SET_ERROR':
      return { ...state, result: { ...state.result, error: action.payload } };
    case 'RESULT_ADD':
      return { ...state, result: { ...state.result, items: [action.payload, ...state.result.items] } };
    case 'RESULT_UPDATE':
      return {
        ...state,
        result: {
          ...state.result,
          items: state.result.items.map((it) =>
            it.id === action.payload.id ? { ...it, content: action.payload.content } : it,
          ),
        },
      };
    case 'RESULT_DELETE':
      return {
        ...state,
        result: {
          ...state.result,
          items: state.result.items.filter((it) => it.id !== action.payload),
        },
      };
    case 'RESULT_SET_ALL':
      return { ...state, result: { ...state.result, items: action.payload } };
    case 'KEY_SET':
      return { ...state, key: { ...state.key, value: action.payload.value, masked: action.payload.masked } };
    case 'KEY_SET_VALID':
      return { ...state, key: { ...state.key, isValid: action.payload } };
    case 'KEY_SET_VALIDATING':
      return { ...state, key: { ...state.key, validating: action.payload } };
    case 'KEY_CLEAR':
      return { ...state, key: { value: '', masked: '', isValid: null, validating: false } };
    default:
      return state;
  }
}
