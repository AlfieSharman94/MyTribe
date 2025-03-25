export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  StorageDebug: undefined;
};

export type TabParamList = {
  Home: undefined;
  MyTribe: undefined;
};

export type MyTribeStackParamList = {
  MyTribeMain: { refresh?: number } | undefined;
  ContactDetail: { contact: Contact };
  AddContact: undefined;
}; 