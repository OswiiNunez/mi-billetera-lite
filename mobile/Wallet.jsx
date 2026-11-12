import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Platform, Pressable,
  StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, formatMoney, summarize, validateExpense } from '../finance.js';
import { createExpenseStorage } from './storage.js';
import { Icon } from './Icon.jsx';
import { Select } from './Select.jsx';

const { loadExpenses, saveExpenses } = createExpenseStorage(AsyncStorage);

const C = {
  ink: '#1c302f', muted: '#667771', green: '#165c4e', greenDark: '#102d2a', lime: '#d4eeb5',
  line: '#e5e9e3', page: '#f4f5ef', softLine: '#edf0e9'
};
const categoryStyles = {
  Comida: { color: '#a16c32', bg: '#f8efdd' },
  Transporte: { color: '#5b79a5', bg: '#eaf0f9' },
  Servicios: { color: '#a98b36', bg: '#f7f1df' },
  Ocio: { color: '#9070a7', bg: '#f0eaf7' },
  Otros: { color: '#638570', bg: '#eaf1e8' }
};
const STORAGE_FORM_ERROR = 'No se pudo abrir el almacenamiento local. Habilita los datos del sitio y recarga para registrar gastos.';
const dateFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const categoryOptions = CATEGORIES.map(name => ({ label: name, value: name }));
const filterOptions = [{ label: 'Todas las categorías', value: '' }, ...categoryOptions];

const Input = React.forwardRef(function Input({ style, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return <TextInput
    ref={ref}
    placeholderTextColor="#94a095"
    {...props}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    style={[s.input, style, focused && s.inputFocused]}
  />;
});

function CategorySymbol({ category, width = 32, height = 35, radius = 10, iconSize = 17 }) {
  const style = categoryStyles[category];
  return <View style={{ width, height, borderRadius: radius, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={category} size={iconSize} color={style.color} />
  </View>;
}

function Heading({ number, title, subtitle }) {
  return <View style={s.sectionHeading}>
    <View style={s.sectionNumber}><Text style={s.sectionNumberText}>{number}</Text></View>
    <View style={s.grow}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSubtitle}>{subtitle}</Text></View>
  </View>;
}

function Metric({ icon, tint, iconColor, label, value, caption }) {
  return <View style={s.metric}>
    <View style={s.metricTop}>
      <View style={[s.metricIcon, { backgroundColor: tint }]}><Icon name={icon} size={16} color={iconColor} /></View>
      <View style={s.grow}>
        <Text style={s.metricLabel}>{label}</Text>
        <Text style={s.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      </View>
    </View>
    <Text style={s.metricCaption}>{caption}</Text>
  </View>;
}

function Wallet() {
  const [expenses, setExpenses] = useState([]);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(new Date());
  const busy = useRef(false);
  const toastTimer = useRef();
  const conceptInput = useRef();

  async function refresh() {
    try {
      setExpenses(await loadExpenses());
      setHistoryError('');
      setFormError(current => (current === STORAGE_FORM_ERROR ? '' : current));
      setReady(true);
    } catch {
      setReady(false);
      setFormError(STORAGE_FORM_ERROR);
      setHistoryError('No se pudo leer el historial de este dispositivo.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      setNow(new Date());
      if (!busy.current) refresh();
    });
    const network = NetInfo.addEventListener(state => setOnline(state.isConnected !== false));
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { appState.remove(); network(); clearInterval(timer); clearTimeout(toastTimer.current); };
  }, []);

  function closeToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function showToast(message, expense = null) {
    clearTimeout(toastTimer.current);
    setToast({ message, expense });
    toastTimer.current = setTimeout(closeToast, expense ? 10000 : 5000);
  }

  async function persist(next) {
    busy.current = true;
    setSaving(true);
    try { await saveExpenses(next); setExpenses(next); return true; }
    catch { return false; }
    finally { busy.current = false; setSaving(false); }
  }

  async function add() {
    if (!ready || busy.current) return;
    setFormError('');
    let expense;
    try { expense = validateExpense(concept, amount, category); }
    catch (error) { setFormError(error.message); return; }
    expense.id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    if (await persist([expense, ...expenses])) {
      setConcept(''); setAmount(''); setCategory('');
      showToast('Gasto guardado en tu dispositivo.');
      conceptInput.current?.focus();
    } else setFormError('No se pudo guardar. Revisa que el dispositivo tenga espacio disponible. Tus datos del formulario siguen aquí.');
  }

  async function remove(expense) {
    if (!ready || busy.current) return;
    if (await persist(expenses.filter(record => record.id !== expense.id))) showToast('Gasto eliminado.', expense);
    else showToast('No se pudo eliminar el gasto. Inténtalo de nuevo.');
  }

  async function undo() {
    const expense = toast?.expense;
    if (!expense || !ready || busy.current) return;
    if (expenses.some(record => record.id === expense.id)) { closeToast(); return; }
    const next = [...expenses, expense].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    if (await persist(next)) showToast('Gasto restaurado.');
    else showToast('No se pudo restaurar. Actualiza el historial e inténtalo de nuevo.');
  }

  const summary = summarize(expenses, now);
  const text = query.trim().toLocaleLowerCase('es-MX');
  const visible = expenses.filter(expense => (!filter || expense.category === filter) && expense.concept.toLocaleLowerCase('es-MX').includes(text));
  const filtering = Boolean(text || filter);
  const disabled = !ready || saving;
  const countLabel = `${summary.count} ${summary.count === 1 ? 'gasto' : 'gastos'}`;

  const header = <View>
    <View style={s.header}>
      <View style={s.brand}>
        <View style={s.brandMark}><Icon name="wallet" size={21} color={C.lime} /></View>
        <Text style={s.brandName}>mi billetera</Text>
        <View style={s.liteTag}><Text style={s.liteText}>LITE</Text></View>
      </View>
      <View accessible accessibilityLabel={online ? 'Con conexión a internet' : 'Sin conexión a internet'} style={[s.statusDot, !online && s.statusDotOffline]} />
    </View>

    <View style={s.pageHeading}>
      <Text style={s.eyebrow}>UN POCO DE ORDEN, CADA DÍA</Text>
      <Text style={s.h1} accessibilityRole="header">Tu dinero, más claro.</Text>
      <Text style={s.lead}>Registra lo que gastas. Sigue con tu día.</Text>
    </View>

    <View accessibilityLabel="Resumen de tus gastos">
      <View style={s.balanceCard}>
        <View style={s.balanceRing} pointerEvents="none" />
        <View style={s.balanceLabelRow}>
          <Text style={s.smallIcon}>↗</Text>
          <Text style={s.balanceLabel}>Total de gastos</Text>
          <View style={s.currencyTag}><Text style={s.currencyText}>MXN</Text></View>
        </View>
        <Text style={s.balance} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(summary.total)}</Text>
        <View style={s.balanceFooter}>
          <Text style={s.balanceFooterText}>Todos tus registros</Text>
          <View style={s.decoration}><Text style={s.decorationText}>↗</Text></View>
        </View>
      </View>
      <View style={s.metrics}>
        <Metric icon="today" tint="#e8eddf" iconColor="#4e6741" label="Gastado hoy" value={formatMoney(summary.today)} caption="Un día a la vez" />
        <Metric icon="receipt" tint="#ece9f6" iconColor="#72618b" label="Gastos registrados" value={String(summary.count)} caption={summary.count ? 'Cada registro cuenta' : 'Aquí empieza tu historial'} />
      </View>
    </View>

    <View style={[s.card, s.cardGap]}>
      <Heading number="01" title="Agregar un gasto" subtitle="Los pequeños gastos también cuentan." />
      <View style={s.form}>
        <Text style={s.label}>¿En qué gastaste?</Text>
        <Input ref={conceptInput} accessibilityLabel="¿En qué gastaste?" placeholder="Ej. Café de la mañana" value={concept} onChangeText={setConcept} maxLength={80} editable={!disabled} />
        <View style={s.formColumns}>
          <View style={s.col}>
            <Text style={s.label}>Monto <Text style={s.optional}>(MXN)</Text></Text>
            <View>
              <Input accessibilityLabel="Monto (MXN)" placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={12} editable={!disabled} style={s.amountInput} />
              <View style={s.dollarSign} pointerEvents="none"><Text style={s.dollarText}>$</Text></View>
            </View>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Categoría</Text>
            <Select label="Categoría" value={category} options={categoryOptions} placeholder="Seleccionar" onChange={setCategory} disabled={disabled} />
          </View>
        </View>
        <Text style={s.hint}>Usa hasta 2 decimales. Ej. 45.50</Text>
        {formError ? <Text accessibilityRole="alert" style={[s.error, s.errorGap]}>{formError}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Guardar gasto" disabled={disabled} onPress={add} style={[s.save, disabled && s.saveDisabled]}>
          {saving || loading ? <ActivityIndicator color="#ffffff" /> : <Text style={s.savePlus}>＋</Text>}
          <Text style={s.saveText}>Guardar gasto</Text>
        </Pressable>
      </View>
      <View style={s.localNote}>
        <Icon name="shield" size={15} color="#728471" />
        <Text style={s.localNoteText}>Tus gastos se guardan en este dispositivo.</Text>
      </View>
    </View>

    <View style={s.cardTop}>
      <View style={s.historyHeading}>
        <View style={s.grow}><Heading number="03" title="Tu historial" subtitle="Del más reciente al más antiguo." /></View>
        <View style={s.pill}><Text style={s.pillText}>{countLabel}</Text></View>
      </View>
      <View style={s.historyTools}>
        <View style={s.searchField}>
          <View style={s.searchIcon} pointerEvents="none"><Icon name="search" size={16} color="#8a988b" /></View>
          <Input accessibilityLabel="Buscar un gasto por concepto" placeholder="Buscar un gasto…" value={query} onChangeText={setQuery} autoCorrect={false} style={s.searchInput} />
        </View>
        <Select label="Filtrar historial por categoría" value={filter} options={filterOptions} placeholder="Todas las categorías" onChange={setFilter} compact style={s.filterSelect} />
      </View>
      {historyError ? <Text accessibilityRole="alert" style={[s.error, s.errorGap]}>{historyError}</Text> : null}
    </View>
  </View>;

  const footer = <View>
    <View style={s.cardBottom}>
      {filtering && expenses.length ? <Text style={s.filterMessage}>
        {visible.length
          ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}. El total superior incluye todos tus gastos.`
          : 'No hay gastos que coincidan con tu búsqueda.'}
      </Text> : null}
    </View>
    <View style={[s.card, s.categoryCard]}>
      <Heading number="02" title="¿A dónde se va?" subtitle="Tus gastos, por categoría." />
      <View style={s.categorySummary}>
        {CATEGORIES.map(name => {
          const value = summary.categories[name];
          return <View key={name} style={s.categoryRow}>
            <CategorySymbol category={name} width={28} height={28} />
            <View style={s.grow}>
              <View style={s.categoryTopline}>
                <Text style={s.categoryName}>{name}</Text>
                <Text style={s.categoryAmount}>{formatMoney(value)}</Text>
              </View>
              <View style={s.categoryBar}><View style={{ height: '100%', borderRadius: 3, backgroundColor: categoryStyles[name].color, width: `${summary.total ? value / summary.total * 100 : 0}%` }} /></View>
            </View>
          </View>;
        })}
      </View>
      <Text style={s.categoryFootnote}>Una vista de todos tus registros.</Text>
    </View>
    <View style={s.footer}>
      <Text style={s.footerText}>mi billetera <Text style={s.footerBold}>LITE</Text>  /  Menos ruido. Más control.</Text>
      <Text style={s.footerText}>Hecha para acompañarte, incluso sin conexión.</Text>
    </View>
  </View>;

  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={visible}
        keyExtractor={expense => expense.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        ListEmptyComponent={!historyError && !expenses.length && !loading ? <View style={s.cardMid}>
          <View style={s.emptyState}>
            <View style={s.emptyIcon}><Icon name="empty" size={25} color="#749166" /></View>
            <Text style={s.emptyTitle}>Todo empieza con un gasto.</Text>
            <Text style={s.emptyText}>Agrega el primero y empieza a conocer tus hábitos.</Text>
          </View>
        </View> : null}
        renderItem={({ item, index }) => <View style={s.cardMid}>
          <View style={[s.expenseItem, index === visible.length - 1 && s.expenseItemLast]}>
            <CategorySymbol category={item.category} />
            <View style={s.grow}>
              <Text style={s.expenseConcept}>{item.concept}</Text>
              <Text style={s.expenseMeta}>{item.category} · {dateFormat.format(new Date(item.createdAt))}</Text>
            </View>
            <Text style={s.expenseAmount}>{formatMoney(item.amountCents)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar gasto: ${item.concept}`} disabled={disabled} onPress={() => remove(item)} style={s.deleteButton}>
              <Icon name="trash" size={16} color="#9ca79a" />
            </Pressable>
          </View>
        </View>}
      />
      {toast ? <View style={s.toast} accessibilityLiveRegion="polite">
        <Text style={s.toastText}>{toast.message}</Text>
        {toast.expense ? <Pressable accessibilityRole="button" onPress={undo} style={s.toastButton}><Text style={s.toastAction}>Deshacer</Text></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={closeToast} style={s.toastButton}><Text style={s.toastClose}>×</Text></Pressable>
      </View> : null}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><Wallet /></SafeAreaProvider>;
}

const cardBase = { backgroundColor: '#ffffff', borderColor: C.line };
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.page },
  content: { paddingHorizontal: 16, width: '100%', maxWidth: 680, alignSelf: 'center' },
  grow: { flex: 1, minWidth: 0 },

  header: { minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: '#dce2d8' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 33, height: 33, backgroundColor: C.greenDark, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.6, color: C.ink },
  liteTag: { marginLeft: -4, backgroundColor: '#e2e9d9', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 },
  liteText: { fontSize: 8, letterSpacing: 1, fontWeight: '700', color: C.ink },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#37805b' },
  statusDotOffline: { backgroundColor: '#bc7b28' },

  pageHeading: { marginTop: 28, marginBottom: 27 },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, fontWeight: '700', color: '#5f7768', marginBottom: 10 },
  h1: { fontSize: 30, lineHeight: 35, letterSpacing: -1.5, fontWeight: '600', color: C.ink, marginBottom: 10 },
  lead: { fontSize: 12, color: C.muted },

  balanceCard: { backgroundColor: C.greenDark, borderRadius: 22, paddingVertical: 22, paddingHorizontal: 24, overflow: 'hidden', marginBottom: 12 },
  balanceRing: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: '#365548', right: -70, bottom: -90 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallIcon: { fontSize: 19, color: C.lime },
  balanceLabel: { fontSize: 13, color: '#dbe5d9' },
  currencyTag: { marginLeft: 'auto', borderWidth: 1, borderColor: '#456055', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 6 },
  currencyText: { fontSize: 10, color: '#ccdbc9' },
  balance: { fontSize: 43, lineHeight: 52, fontWeight: '600', letterSpacing: -1.5, color: '#ffffff', marginVertical: 9 },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceFooterText: { fontSize: 11, color: '#b7c7bd' },
  decoration: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  decorationText: { fontSize: 17, lineHeight: 21, color: C.greenDark },

  metrics: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  metric: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: C.line, backgroundColor: '#fcfdf9', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 14 },
  metricTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metricIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 11, color: C.muted },
  metricValue: { fontSize: 21, fontWeight: '600', letterSpacing: -0.8, color: C.ink },
  metricCaption: { fontSize: 10, color: '#819087', marginTop: 10 },

  card: { ...cardBase, borderWidth: 1, borderRadius: 22, paddingVertical: 21, paddingHorizontal: 18 },
  cardGap: { marginBottom: 18 },
  cardTop: { ...cardBase, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 21, paddingHorizontal: 18 },
  cardMid: { ...cardBase, borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 18 },
  cardBottom: { ...cardBase, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingHorizontal: 18, paddingBottom: 6, marginBottom: 18 },
  categoryCard: { marginBottom: 0 },

  sectionHeading: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  sectionNumber: { width: 29, height: 29, borderWidth: 1, borderColor: '#e2e7dc', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionNumberText: { fontSize: 10, fontWeight: '600', color: '#7a8c77' },
  sectionTitle: { fontSize: 16, lineHeight: 22, letterSpacing: -0.4, fontWeight: '600', color: C.ink, marginTop: 1, marginBottom: 4 },
  sectionSubtitle: { fontSize: 10, color: C.muted },

  form: { marginTop: 24 },
  label: { fontSize: 12, fontWeight: '600', color: C.ink, marginBottom: 7 },
  optional: { fontSize: 10, fontWeight: '400', color: '#87928b' },
  input: { minHeight: 45, backgroundColor: '#fafbf8', borderWidth: 1, borderColor: '#dce3d8', borderRadius: 9, color: C.ink, fontSize: 13, paddingVertical: 10, paddingHorizontal: 12 },
  inputFocused: { borderColor: '#368573', backgroundColor: '#ffffff' },
  formColumns: { flexDirection: 'row', gap: 12, marginTop: 18 },
  col: { flex: 1, minWidth: 0 },
  amountInput: { paddingLeft: 29 },
  dollarSign: { position: 'absolute', left: 13, top: 0, bottom: 0, justifyContent: 'center' },
  dollarText: { fontSize: 14, color: '#7c8a7f' },
  hint: { fontSize: 10, color: '#849182', marginTop: 7, marginBottom: 20 },
  error: { fontSize: 12, color: '#9c302b', backgroundColor: '#fff1ed', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 7 },
  errorGap: { marginBottom: 14 },
  save: { minHeight: 48, borderRadius: 10, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 10, paddingHorizontal: 17 },
  saveDisabled: { opacity: 0.65 },
  savePlus: { fontSize: 21, lineHeight: 24, color: '#ffffff' },
  saveText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  localNote: { borderTopWidth: 1, borderTopColor: C.softLine, paddingTop: 16, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  localNoteText: { fontSize: 9, color: '#728471' },

  historyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pill: { backgroundColor: '#f0f3e9', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  pillText: { fontSize: 10, color: '#64775e' },
  historyTools: { flexDirection: 'row', gap: 8, marginTop: 19, marginBottom: 12 },
  searchField: { flex: 1, minWidth: 0 },
  searchIcon: { position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  searchInput: { paddingLeft: 37, minHeight: 42, fontSize: 11 },
  filterSelect: { width: 148 },

  emptyState: { paddingTop: 37, paddingHorizontal: 10, paddingBottom: 46, alignItems: 'center' },
  emptyIcon: { width: 49, height: 49, borderWidth: 1, borderColor: '#e5eadd', borderRadius: 16, backgroundColor: '#f6f8f1', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 5, textAlign: 'center' },
  emptyText: { fontSize: 11, color: '#899584', textAlign: 'center' },

  expenseItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: C.softLine },
  expenseItemLast: { borderBottomWidth: 0 },
  expenseConcept: { fontSize: 12, fontWeight: '600', color: C.ink, marginBottom: 4 },
  expenseMeta: { fontSize: 9, color: '#83917f' },
  expenseAmount: { fontSize: 12, fontWeight: '600', color: C.ink },
  deleteButton: { width: 27, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  filterMessage: { fontSize: 11, color: C.muted, paddingVertical: 12, textAlign: 'center' },

  categorySummary: { marginTop: 22 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  categoryTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 },
  categoryName: { fontSize: 11, color: C.ink },
  categoryAmount: { fontSize: 11, fontWeight: '600', color: C.ink },
  categoryBar: { height: 4, borderRadius: 3, backgroundColor: '#f0f2eb', overflow: 'hidden' },
  categoryFootnote: { borderTopWidth: 1, borderTopColor: C.softLine, fontSize: 10, color: '#8a9587', paddingTop: 14, marginTop: 3 },

  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 7, marginVertical: 23 },
  footerText: { fontSize: 9, color: '#85907e' },
  footerBold: { fontSize: 8, fontWeight: '600', letterSpacing: 0.6 },

  toast: { position: 'absolute', bottom: 16, alignSelf: 'center', maxWidth: '92%', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#193a32', borderWidth: 1, borderColor: '#496152', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 17, elevation: 8, shadowColor: '#193a32', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  toastText: { flexShrink: 1, fontSize: 11, color: '#ffffff' },
  toastButton: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  toastAction: { fontSize: 12, fontWeight: '600', color: '#d8edbd' },
  toastClose: { fontSize: 19, lineHeight: 22, color: '#d8edbd' }
});
