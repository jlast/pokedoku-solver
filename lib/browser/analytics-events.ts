export type AnalyticsMetadataPrimitive = string | number | boolean;
export type AnalyticsMetadataValue = AnalyticsMetadataPrimitive | AnalyticsMetadataPrimitive[] | undefined;

export type PageName =
  | 'home'
  | 'today'
  | 'bonus'
  | 'pokemon_list'
  | 'custom'
  | 'tools'
  | 'tips'
  | 'login'
  | 'historic_answers'
  | 'puzzle_stats'
  | 'user'
  | 'user_pokedex'
  | 'user_settings'
  | (string & {});

export type Location =
  | 'header'
  | 'footer'
  | 'grid'
  | 'suggestions'
  | 'login_page'
  | 'mobile_menu'
  | 'desktop_nav'
  | 'profile_menu'
  | 'tools_menu'
  | 'puzzle_stats'
  | 'historic_answers'
  | 'promo_card'
  | (string & {});

export type Source =
  | 'button'
  | 'link'
  | 'overlay'
  | 'close'
  | 'navigate'
  | 'support'
  | 'suggestions'
  | 'desktop'
  | 'mobile'
  | (string & {});

export interface AnalyticsBase {
  page_name?: PageName;
  location?: Location;
  source?: Source;
  target?: string;
  value?: string;
  count?: number;
  enabled?: boolean;
  status?: 'success' | 'error';
}

export interface AnalyticsEventMap {
  page_view: AnalyticsBase & {
    page_name: PageName;
  };
  ui_click: AnalyticsBase & {
    target: string;
    pokemon_id?: number;
    has_constraint?: boolean;
    has_pokemon?: boolean;
  };
  filter_update: AnalyticsBase & {
    target: string;
  };
  search_update: AnalyticsBase & {
    target: 'query';
  };
  sort_update: AnalyticsBase & {
    target: string;
    value: string;
  };
  constraint_update: AnalyticsBase & {
    target: 'row' | 'col';
    value: string;
  };
  pokemon_select: AnalyticsBase & {
    target: 'pokemon';
    value: string;
    pokemon_id: number;
  };
  dex_state_update: AnalyticsBase & {
    target: 'pokemon' | 'selection';
    value?: string;
    pokemon_key_id?: number;
    caught?: boolean;
    shiny?: boolean;
  };
  bulk_action: AnalyticsBase & {
    target: 'clear_all' | 'mark_all_completed';
  };
  toggle_setting: AnalyticsBase & {
    target: 'theme' | 'spoiler_mode' | 'legacy_filters' | 'tip';
  };
  menu_interaction: AnalyticsBase & {
    target: 'mobile' | (string & {});
    value: 'open' | 'close';
  };
  content_open: AnalyticsBase & {
    target: 'historic_answer' | (string & {});
    value: string;
  };
  system_event: AnalyticsBase & {
    target: 'puzzle_stats_load' | 'puzzle_stats_pokemon_load' | (string & {});
    status: 'success' | 'error';
    message?: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;
