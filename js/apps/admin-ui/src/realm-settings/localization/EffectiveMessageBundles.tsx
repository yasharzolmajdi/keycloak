import {
  ActionGroup,
  Button,
  Chip,
  ChipGroup,
  Divider,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Select,
  SelectOption,
  SelectVariant,
  Text,
  TextContent,
  TextVariants,
} from "@patternfly/react-core";
import { pickBy } from "lodash-es";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { adminClient } from "../../admin-client";
import { KeycloakTextInput } from "../../components/keycloak-text-input/KeycloakTextInput";
import { ListEmptyState } from "../../components/list-empty-state/ListEmptyState";
import { KeycloakDataTable } from "../../components/table-toolbar/KeycloakDataTable";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useServerInfo } from "../../context/server-info/ServerInfoProvider";
import { useWhoAmI } from "../../context/whoami/WhoAmI";
import { DEFAULT_LOCALE } from "../../i18n/i18n";
import { localeToDisplayName } from "../../util";
import useLocaleSort, { mapByKey } from "../../utils/useLocaleSort";
import DropdownPanel from "../../components/dropdown-panel/DropdownPanel";

type EffectiveMessageBundlesProps = {
  defaultSupportedLocales: string[];
  defaultLocales: string[];
};

type EffectiveMessageBundlesSearchForm = {
  theme: string;
  themeType: string;
  locale: string;
  hasWords: string[];
};

const defaultValues: EffectiveMessageBundlesSearchForm = {
  theme: "",
  themeType: "",
  locale: "",
  hasWords: [],
};

export const EffectiveMessageBundles = ({
  defaultSupportedLocales,
  defaultLocales,
}: EffectiveMessageBundlesProps) => {
  const { t } = useTranslation();
  const { realm } = useRealm();
  const serverInfo = useServerInfo();
  const { whoAmI } = useWhoAmI();
  const localeSort = useLocaleSort();
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectThemesOpen, setSelectThemesOpen] = useState(false);
  const [selectThemeTypeOpen, setSelectThemeTypeOpen] = useState(false);
  const [selectLanguageOpen, setSelectLanguageOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Partial<EffectiveMessageBundlesSearchForm>
  >({});
  const [key, setKey] = useState(0);
  const themes = serverInfo.themes;

  const themeTypes = useMemo(() => {
    if (!themes) {
      return [];
    }

    return localeSort(Object.keys(themes), (key) => key);
  }, [themes]);

  const themeNames = useMemo(() => {
    if (!themes) {
      return [];
    }

    return localeSort(
      Object.values(themes as Record<string, { name: string }[]>)
        .flatMap((theme) => theme.map((item) => item.name))
        .filter((value, index, self) => self.indexOf(value) === index),
      (name) => name,
    );
  }, [themes]);

  const combinedLocales = useMemo(() => {
    return Array.from(new Set([...defaultLocales, ...defaultSupportedLocales]));
  }, [defaultLocales, defaultSupportedLocales]);

  const filterLabels: Record<keyof EffectiveMessageBundlesSearchForm, string> =
    {
      theme: t("theme"),
      themeType: t("themeType"),
      locale: t("language"),
      hasWords: t("hasWords"),
    };

  const {
    getValues,
    reset,
    formState: { isDirty, isValid },
    control,
  } = useForm<EffectiveMessageBundlesSearchForm>({
    mode: "onChange",
    defaultValues,
  });

  const loader = async () => {
    try {
      const filter = getValues();
      const messages = await adminClient.serverInfo.findEffectiveMessageBundles(
        {
          realm,
          ...filter,
          locale: filter.locale || DEFAULT_LOCALE,
          source: true,
        },
      );

      const filteredMessages =
        filter.hasWords.length > 0
          ? messages.filter((m) =>
              filter.hasWords.some(
                (f) => m.value.includes(f) || m.key.includes(f),
              ),
            )
          : messages;

      const sortedMessages = localeSort([...filteredMessages], mapByKey("key"));

      return sortedMessages;
    } catch (error) {
      return [];
    }
  };

  function submitSearch() {
    setSearchDropdownOpen(false);
    commitFilters();
  }

  function resetSearch() {
    reset();
    commitFilters();
  }

  function removeFilter(key: keyof EffectiveMessageBundlesSearchForm) {
    const formValues: EffectiveMessageBundlesSearchForm = { ...getValues() };
    delete formValues[key];

    reset({ ...defaultValues, ...formValues });
    commitFilters();
  }

  function removeFilterValue(
    key: keyof EffectiveMessageBundlesSearchForm,
    valueToRemove: string,
  ) {
    const formValues = getValues();
    const fieldValue = formValues[key];
    const newFieldValue = Array.isArray(fieldValue)
      ? fieldValue.filter((val) => val !== valueToRemove)
      : fieldValue;

    reset({ ...formValues, [key]: newFieldValue });
    commitFilters();
  }

  function commitFilters() {
    const newFilters: Partial<EffectiveMessageBundlesSearchForm> = pickBy(
      getValues(),
      (value) => value !== "" || (Array.isArray(value) && value.length > 0),
    );

    setActiveFilters(newFilters);
    setKey(key + 1);
  }

  const effectiveMessageBunldesSearchFormDisplay = () => {
    return (
      <Flex
        direction={{ default: "column" }}
        spaceItems={{ default: "spaceItemsNone" }}
      >
        <FlexItem>
          <TextContent>
            <Text className="pf-u-mb-md pf-u-mt-0" component={TextVariants.p}>
              {t("effectiveMessageBundlesDescription")}
            </Text>
          </TextContent>
        </FlexItem>
        <FlexItem>
          <DropdownPanel
            buttonText={t("searchForEffectiveMessageBundles")}
            setSearchDropdownOpen={setSearchDropdownOpen}
            searchDropdownOpen={searchDropdownOpen}
            width="15vw"
          >
            <Form
              isHorizontal
              className="pf-u-w-25vw"
              data-testid="effectiveMessageBundlesSearchForm"
              onSubmit={(e) => e.preventDefault()}
            >
              <FormGroup label={t("theme")} fieldId="kc-theme" isRequired>
                <Controller
                  name="theme"
                  control={control}
                  rules={{
                    validate: (value) => (value || "").length > 0,
                  }}
                  render={({ field }) => (
                    <Select
                      name="theme"
                      data-testid="effective_message_bundles-theme-searchField"
                      chipGroupProps={{
                        numChips: 1,
                        expandedText: t("hide"),
                        collapsedText: t("showRemaining"),
                      }}
                      variant={SelectVariant.single}
                      typeAheadAriaLabel="Select"
                      onToggle={setSelectThemesOpen}
                      selections={field.value}
                      onSelect={(_, selectedValue) => {
                        field.onChange(selectedValue.toString());
                        setSelectThemesOpen(false);
                      }}
                      onClear={(theme) => {
                        theme.stopPropagation();
                        field.onChange("");
                      }}
                      isOpen={selectThemesOpen}
                      aria-labelledby={t("theme")}
                      chipGroupComponent={
                        <ChipGroup>
                          <Chip
                            key={field.value}
                            onClick={(theme) => {
                              theme.stopPropagation();
                              field.onChange("");
                            }}
                          >
                            {field.value}
                          </Chip>
                        </ChipGroup>
                      }
                    >
                      {[
                        <SelectOption
                          key="theme_placeholder"
                          value="Select theme"
                          label={t("selectTheme")}
                          className="kc__effective_message_bundles_search_theme__placeholder"
                          isDisabled
                        />,
                      ].concat(
                        themeNames.map((option) => (
                          <SelectOption key={option} value={option} />
                        )),
                      )}
                    </Select>
                  )}
                />
              </FormGroup>
              <FormGroup
                label={t("themeType")}
                fieldId="kc-themeType"
                isRequired
              >
                <Controller
                  name="themeType"
                  control={control}
                  rules={{
                    validate: (value) => (value || "").length > 0,
                  }}
                  render={({ field }) => (
                    <Select
                      name="themeType"
                      data-testid="effective-message-bundles-feature-searchField"
                      chipGroupProps={{
                        numChips: 1,
                        expandedText: t("hide"),
                        collapsedText: t("showRemaining"),
                      }}
                      variant={SelectVariant.single}
                      typeAheadAriaLabel="Select"
                      onToggle={setSelectThemeTypeOpen}
                      selections={field.value}
                      onSelect={(_, selectedValue) => {
                        field.onChange(selectedValue.toString());
                        setSelectThemeTypeOpen(false);
                      }}
                      onClear={(themeType) => {
                        themeType.stopPropagation();
                        field.onChange("");
                      }}
                      isOpen={selectThemeTypeOpen}
                      aria-labelledby={t("themeType")}
                      chipGroupComponent={
                        <ChipGroup>
                          <Chip
                            key={field.value}
                            onClick={(themeType) => {
                              themeType.stopPropagation();
                              field.onChange("");
                            }}
                          >
                            {field.value}
                          </Chip>
                        </ChipGroup>
                      }
                    >
                      {[
                        <SelectOption
                          key="themeType_placeholder"
                          value="Select theme type"
                          label={t("selectThemeType")}
                          className="pf-m-plain"
                          isDisabled
                        />,
                      ].concat(
                        themeTypes.map((option) => (
                          <SelectOption key={option} value={option} />
                        )),
                      )}
                    </Select>
                  )}
                />
              </FormGroup>
              <FormGroup label={t("language")} fieldId="kc-language" isRequired>
                <Controller
                  name="locale"
                  control={control}
                  rules={{
                    validate: (value) => (value || "").length > 0,
                  }}
                  render={({ field }) => (
                    <Select
                      name="language"
                      data-testid="effective-message-bundles-language-searchField"
                      chipGroupProps={{
                        numChips: 1,
                        expandedText: t("hide"),
                        collapsedText: t("showRemaining"),
                      }}
                      variant={SelectVariant.single}
                      typeAheadAriaLabel="Select"
                      onToggle={setSelectLanguageOpen}
                      selections={field.value}
                      onSelect={(_, selectedValue) => {
                        field.onChange(selectedValue.toString());
                        setSelectLanguageOpen(false);
                      }}
                      onClear={(language) => {
                        language.stopPropagation();
                        field.onChange("");
                      }}
                      isOpen={selectLanguageOpen}
                      aria-labelledby="language"
                      chipGroupComponent={
                        <ChipGroup>
                          {field.value ? (
                            <Chip
                              key={field.value}
                              onClick={(language) => {
                                language.stopPropagation();
                                field.onChange("");
                              }}
                            >
                              {localeToDisplayName(
                                field.value,
                                whoAmI.getLocale(),
                              )}
                            </Chip>
                          ) : null}
                        </ChipGroup>
                      }
                    >
                      {[
                        <SelectOption
                          key="language_placeholder"
                          value="Select language"
                          label={t("selectLanguage")}
                          className="pf-m-plain"
                          isDisabled
                        />,
                      ].concat(
                        combinedLocales.map((option) => (
                          <SelectOption key={option} value={option}>
                            {localeToDisplayName(option, whoAmI.getLocale())}
                          </SelectOption>
                        )),
                      )}
                    </Select>
                  )}
                />
              </FormGroup>
              <FormGroup label={t("hasWords")} fieldId="kc-hasWords">
                <Controller
                  name="hasWords"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <KeycloakTextInput
                        id="kc-hasWords"
                        data-testid="effective-message-bundles-hasWords-searchField"
                        value={field.value.join(" ")}
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement;
                          const input = target.value;

                          if (input.trim().length === 0) {
                            field.onChange([]);
                          } else {
                            const words = input
                              .split(" ")
                              .map((word) => word.trim());
                            field.onChange(words);
                          }
                        }}
                      />
                      <ChipGroup>
                        {field.value.map((word, index) => (
                          <Chip
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newWords = field.value.filter(
                                (_, i) => i !== index,
                              );
                              field.onChange(newWords);
                            }}
                          >
                            {word}
                          </Chip>
                        ))}
                      </ChipGroup>
                    </div>
                  )}
                />
              </FormGroup>
              <ActionGroup className="pf-u-mt-sm">
                <Button
                  variant={"primary"}
                  onClick={() => {
                    setSearchPerformed(true);
                    submitSearch();
                  }}
                  data-testid="search-effective-message-bundles-btn"
                  isDisabled={!isValid}
                >
                  {t("search")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={resetSearch}
                  data-testid="reset-search-effective-message-bundles-btn"
                  isDisabled={!isDirty}
                >
                  {t("reset")}
                </Button>
              </ActionGroup>
            </Form>
          </DropdownPanel>
          <Button
            variant="primary"
            className="pf-u-ml-md"
            onClick={() => submitSearch()}
            data-testid="refresh-effective-message-bundles-btn"
          >
            {t("refresh")}
          </Button>
        </FlexItem>
        <FlexItem>
          {Object.entries(activeFilters).length > 0 && (
            <>
              {Object.entries(activeFilters).map((filter) => {
                const [key, value] = filter as [
                  keyof EffectiveMessageBundlesSearchForm,
                  string | string[],
                ];
                return (
                  <ChipGroup
                    className="pf-u-mt-md pf-u-mr-md"
                    key={key}
                    categoryName={filterLabels[key]}
                    isClosable
                    onClick={() => removeFilter(key)}
                  >
                    {typeof value === "string" ? (
                      <Chip isReadOnly>
                        {key === "locale"
                          ? localeToDisplayName(
                              value,
                              whoAmI.getLocale(),
                            )?.toLowerCase()
                          : value}
                      </Chip>
                    ) : (
                      value.map((entry) => (
                        <Chip
                          key={entry}
                          onClick={() => removeFilterValue(key, entry)}
                        >
                          {entry}
                        </Chip>
                      ))
                    )}
                  </ChipGroup>
                );
              })}
            </>
          )}
        </FlexItem>
      </Flex>
    );
  };

  if (!searchPerformed) {
    return (
      <>
        <div className="pf-u-py-lg pf-u-pl-md">
          {effectiveMessageBunldesSearchFormDisplay()}
        </div>
        <Divider />
        <ListEmptyState
          message={t("emptyEffectiveMessageBundles")}
          instructions={t("emptyEffectiveMessageBundlesInstructions")}
          isSearchVariant
        />
      </>
    );
  }

  return (
    <KeycloakDataTable
      key={key}
      loader={loader}
      ariaLabelKey="effectiveMessageBundles"
      toolbarItem={effectiveMessageBunldesSearchFormDisplay()}
      columns={[
        {
          name: "key",
          displayKey: "key",
        },
        {
          name: "value",
          displayKey: "value",
        },
      ]}
      emptyState={
        <ListEmptyState
          message={t("noSearchResults")}
          instructions={t("noSearchResultsInstructions")}
        />
      }
      isSearching={Object.keys(activeFilters).length > 0}
    />
  );
};
