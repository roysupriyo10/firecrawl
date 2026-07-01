// Mutation that sets the session's delivery area on the second supported platform. Store pages there
// return no item options until a delivery area is resolved; a scrape session has none. We resolve the
// store's own address (from its JSON-LD) to a place via the geo autocomplete endpoint and set it here,
// which lets the per-item option requests succeed in the same session (no reload). Minimal selection
// set on purpose. Only the required (non-null) variables are sent.
export const SET_LOCATION_MUTATION = `mutation addConsumerAddressV2($lat: Float!, $lng: Float!, $city: String!, $state: String!, $zipCode: String!, $printableAddress: String!, $shortname: String!, $googlePlaceId: String!) {
  addConsumerAddressV2(lat: $lat, lng: $lng, city: $city, state: $state, zipCode: $zipCode, printableAddress: $printableAddress, shortname: $shortname, googlePlaceId: $googlePlaceId) {
    defaultAddress {
      id
      districtId
      __typename
    }
    __typename
  }
}`;

// GraphQL query for a single item's customization/option groups on the second supported platform.
// This is a trimmed version of the document the store page itself sends to its per-item endpoint:
// only the item header and the option groups (with up to two levels of nested options) are kept,
// dropping the unrelated banner/review/carousel/badge fields. The platform's endpoint accepts the
// query inline (no persisted-query hash) and needs only the page's own cookies.
export const ITEM_OPTIONS_QUERY = `query itemPage($storeId: ID!, $itemId: ID!, $isNested: Boolean!, $fulfillmentType: FulfillmentType) {
  itemPage(storeId: $storeId, itemId: $itemId, fulfillmentType: $fulfillmentType) {
    itemHeader @skip(if: $isNested) {
      id
      name
      description
      displayString
      unitAmount
      currency
      decimalPlaces
      __typename
    }
    optionLists {
      ...OptionListFragment
      __typename
    }
    __typename
  }
}
fragment OptionListFragment on OptionList {
  type
  id
  name
  subtitle
  selectionNode
  minNumOptions
  maxNumOptions
  minOptionChoiceQuantity
  maxOptionChoiceQuantity
  minAggregateOptionsQuantity
  maxAggregateOptionsQuantity
  numFreeOptions
  isOptional
  options {
    ...OptionFragment
    nestedExtrasList {
      ...NestedExtrasFragment
      __typename
    }
    __typename
  }
  __typename
}
fragment OptionFragment on FeedOption {
  id
  name
  description
  unitAmount
  currency
  displayString
  decimalPlaces
  chargeAbove
  defaultQuantity
  minOptionChoiceQuantity
  maxOptionChoiceQuantity
  __typename
}
fragment NestedExtrasFragment on OptionList {
  type
  id
  name
  subtitle
  selectionNode
  minNumOptions
  maxNumOptions
  numFreeOptions
  isOptional
  options {
    ...OptionFragment
    nestedExtrasList {
      type
      id
      name
      minNumOptions
      maxNumOptions
      numFreeOptions
      isOptional
      options {
        ...OptionFragment
        __typename
      }
      __typename
    }
    __typename
  }
  __typename
}`;
