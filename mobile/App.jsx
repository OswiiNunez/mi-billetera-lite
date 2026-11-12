import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, AppState, FlatList, Image, KeyboardAvoidingView,
  Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, formatMoney, summarize, validateExpense } from '../finance.js';
import { createExpenseStorage } from './storage.js';

const { loadExpenses, saveExpenses } = createExpenseStorage(AsyncStorage);

const categoryIcons = {
  Comida: 'restaurant-outline', Transporte: 'bus-outline', Servicios: 'flash-outline',
  Ocio: 'game-controller-outline', Otros: 'ellipsis-horizontal'
};

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
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(null);
  const [now, setNow] = useState(new Date());
  const busy = useRef(false);

  async function restore() {
    setLoading(true);
    setError('');
    try {
      setExpenses(await loadExpenses());
      setReady(true);
    } catch {
      setReady(false);
      setError('No se pudo leer el historial. No se sobrescribiran tus datos. Intenta de nuevo.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    restore();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);

  async function commit(next, onSuccess) {
    if (!ready || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await saveExpenses(next);
      setExpenses(next);
      onSuccess?.();
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa el espacio disponible e intenta de nuevo. Tu historial anterior sigue intacto.');
    } finally { busy.current = false; setSaving(false); }
  }

  function add() {
    let expense;
    try { expense = validateExpense(concept, amount, category); }
    catch (validationError) { setError(validationError.message); return; }
    expense.id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    commit([expense, ...expenses], () => { setConcept(''); setAmount(''); setCategory(''); });
  }

  function remove(expense) {
    Alert.alert('Eliminar gasto', `${expense.concept}: ${formatMoney(expense.amountCents)}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        commit(expenses.filter(record => record.id !== expense.id), () => setDeleted(expense));
      } }
    ]);
  }

  function undo() {
    if (!deleted) return;
    const next = [...expenses, deleted].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    commit(next, () => setDeleted(null));
  }

  const summary = summarize(expenses, now);
  const normalizedQuery = query.trim().toLocaleLowerCase('es-MX');
  const visible = expenses.filter(expense => (
    (!filter || expense.category === filter) && expense.concept.toLocaleLowerCase('es-MX').includes(normalizedQuery)
  ));
  const disabled = !ready || saving;

  const header = <View>
    <View style={styles.brand}>
      <Image source={require('../icons/icon-192.png')} style={styles.logo} accessibilityIgnoresInvertColors />
      <View style={styles.grow}><Text style={styles.brandName}>mi billetera LITE</Text><Text style={styles.muted}>Tus gastos, en orden.</Text></View>
    </View>
    <View style={styles.balance}>
      <Text style={styles.balanceLabel}>TOTAL DE GASTOS · MXN</Text>
      <Text style={styles.total} adjustsFontSizeToFit numberOfLines={1}>{formatMoney(summary.total)}</Text>
      <View style={styles.balanceFooter}>
        <Text style={styles.balanceLabel}>Hoy {formatMoney(summary.today)}</Text>
        <Text style={styles.balanceLabel}>{summary.count} {summary.count === 1 ? 'gasto' : 'gastos'}</Text>
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.heading}>Agregar un gasto</Text>
      <Text style={styles.label}>Concepto</Text>
      <TextInput accessibilityLabel="Concepto del gasto" style={styles.input} placeholder="Ej. Cafe de la manana" placeholderTextColor="#697b75" value={concept} onChangeText={setConcept} maxLength={80} editable={!disabled} />
      <Text style={styles.label}>Monto (MXN)</Text>
      <TextInput accessibilityLabel="Monto en pesos" style={styles.input} placeholder="0.00" placeholderTextColor="#697b75" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={12} editable={!disabled} />
      <Text style={styles.label}>Categoria</Text>
      <View style={styles.pickerWrap}><Picker accessibilityLabel="Categoria del gasto" selectedValue={category} onValueChange={setCategory} enabled={!disabled} style={styles.picker} dropdownIconColor="#165c4e">
        <Picker.Item label="Seleccionar" value="" />
        {CATEGORIES.map(name => <Picker.Item key={name} label={name} value={name} />)}
      </Picker></View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!ready && !loading ? <Pressable accessibilityRole="button" onPress={restore} style={styles.retry}><Text style={styles.retryText}>Reintentar lectura</Text></Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Guardar gasto" disabled={disabled} onPress={add} style={[styles.save, disabled && styles.disabled]}>
        {saving || loading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add" size={22} color="#ffffff" />}
        <Text style={styles.saveText}>{saving ? 'Guardando...' : loading ? 'Cargando...' : 'Guardar gasto'}</Text>
      </Pressable>
    </View>
    <View style={styles.section}>
      <Text style={styles.heading}>Por categoria</Text>
      {CATEGORIES.map(name => <View key={name} style={styles.categoryRow}>
        <Ionicons name={categoryIcons[name]} size={20} color="#165c4e" />
        <Text style={[styles.categoryName, styles.grow]}>{name}</Text>
        <Text style={styles.categoryAmount}>{formatMoney(summary.categories[name])}</Text>
      </View>)}
    </View>
    <View style={styles.section}>
      <Text style={styles.heading}>Tu historial</Text>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={20} color="#697b75" />
        <TextInput accessibilityLabel="Buscar por concepto" value={query} onChangeText={setQuery} placeholder="Buscar un gasto" placeholderTextColor="#697b75" style={styles.searchInput} />
      </View>
      <View style={styles.pickerWrap}><Picker accessibilityLabel="Filtrar por categoria" selectedValue={filter} onValueChange={setFilter} style={styles.picker} dropdownIconColor="#165c4e">
        <Picker.Item label="Todas las categorias" value="" />
        {CATEGORIES.map(name => <Picker.Item key={name} label={name} value={name} />)}
      </Picker></View>
      {(query || filter) ? <Text style={styles.muted}>{visible.length} resultados. El total incluye todos los gastos.</Text> : null}
    </View>
  </View>;

  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList data={visible} keyExtractor={expense => expense.id} ListHeaderComponent={header} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        ListEmptyComponent={!loading && ready ? <Text style={styles.empty}>{expenses.length ? 'Sin coincidencias.' : 'Todavia no hay gastos registrados.'}</Text> : null}
        renderItem={({ item }) => <View style={styles.expenseRow}>
          <View style={styles.expenseIcon}><Ionicons name={categoryIcons[item.category]} size={22} color="#165c4e" /></View>
          <View style={styles.grow}>
            <Text style={styles.concept}>{item.concept}</Text>
            <Text style={styles.meta}>{item.category} · {new Date(item.createdAt).toLocaleString('es-MX')}</Text>
            <Text style={styles.expenseAmount}>{formatMoney(item.amountCents)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar gasto: ${item.concept}`} disabled={disabled} onPress={() => remove(item)} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={21} color="#ad3a34" />
          </Pressable>
        </View>}
      />
      {deleted ? <View style={styles.undoBar}>
        <Text style={[styles.grow, styles.undoText]}>Gasto eliminado</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Deshacer eliminacion" disabled={disabled} onPress={undo} style={styles.iconButton}><Ionicons name="arrow-undo-outline" size={23} color="#ffffff" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={() => setDeleted(null)} style={styles.iconButton}><Ionicons name="close" size={23} color="#ffffff" /></Pressable>
      </View> : null}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><Wallet /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5ef' },
  content: { paddingHorizontal: 20, paddingBottom: 30, width: '100%', maxWidth: 680, alignSelf: 'center' },
  grow: { flex: 1, minWidth: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 22 },
  logo: { width: 44, height: 44, borderRadius: 8 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#102d2a' },
  muted: { fontSize: 13, lineHeight: 20, color: '#52665e', marginTop: 4 },
  balance: { backgroundColor: '#102d2a', borderRadius: 8, padding: 22 },
  balanceLabel: { color: '#d4eeb5', fontSize: 13, flexShrink: 1 },
  total: { color: '#ffffff', fontSize: 38, fontWeight: '700', marginVertical: 16 },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  section: { paddingVertical: 22, borderBottomWidth: 1, borderBottomColor: '#d8e0d5' },
  heading: { color: '#102d2a', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#273f36', marginBottom: 7, marginTop: 12 },
  input: { minHeight: 50, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c6d1c4', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, color: '#1c302f', fontSize: 16 },
  pickerWrap: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c6d1c4', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  picker: { color: '#1c302f' },
  save: { minHeight: 52, borderRadius: 6, backgroundColor: '#165c4e', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', padding: 12 },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { color: '#a52e28', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  retry: { paddingVertical: 12 },
  retryText: { color: '#165c4e', fontSize: 15, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  categoryName: { color: '#273f36', fontSize: 15 },
  categoryAmount: { color: '#102d2a', fontWeight: '600', fontSize: 14, flexShrink: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#c6d1c4', borderRadius: 6, backgroundColor: '#ffffff', marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, color: '#1c302f', fontSize: 16, paddingVertical: 12 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: '#d8e0d5' },
  expenseIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e9d9', borderRadius: 6 },
  concept: { color: '#1c302f', fontWeight: '600', fontSize: 16 },
  meta: { color: '#52665e', fontSize: 12, lineHeight: 18, marginTop: 4 },
  expenseAmount: { color: '#102d2a', fontWeight: '700', fontSize: 16, marginTop: 5 },
  iconButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#52665e', paddingVertical: 30, textAlign: 'center', fontSize: 15 },
  undoBar: { backgroundColor: '#102d2a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  undoText: { color: '#ffffff', fontSize: 14 }
});