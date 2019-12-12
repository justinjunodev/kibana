<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [IUiSettingsClient](./kibana-plugin-public.iuisettingsclient.md) &gt; [get$](./kibana-plugin-public.iuisettingsclient.get_.md)

## IUiSettingsClient.get$ property

Gets an observable of the current value for a config key, and all updates to that config key in the future. Providing a `defaultOverride` argument behaves the same as it does in \#get()

<b>Signature:</b>

```typescript
get$: <T = any>(key: string, defaultOverride?: T) => Observable<T>;
```