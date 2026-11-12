import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon.jsx';

export function Select({ label, value, options, placeholder, onChange, disabled, compact, style }) {
  const [open, setOpen] = useState(false);
  const current = options.find(option => option.value === value);
  const text = current ? current.label : placeholder;

  function choose(option) {
    setOpen(false);
    onChange(option.value);
  }

  return <View style={style}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      disabled={disabled}
      onPress={() => setOpen(true)}
      style={[s.field, compact && s.fieldCompact, disabled && s.disabled]}
    >
      <Text numberOfLines={1} style={[s.fieldText, compact && s.fieldTextCompact, !current && s.placeholder]}>{text}</Text>
      <Icon name="chevron" size={16} color="#7c8a7f" />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <Pressable accessibilityLabel="Cerrar lista" style={s.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={s.dialog} onPress={() => {}}>
          <Text style={s.eyebrow}>{label.toUpperCase()}</Text>
          {options.map(option => {
            const selected = option.value === value;
            return <Pressable
              key={option.value || 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => choose(option)}
              style={[s.option, selected && s.optionSelected]}
            >
              <Text style={[s.optionText, selected && s.optionTextSelected]}>{option.label}</Text>
            </Pressable>;
          })}
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  field: { minHeight: 45, backgroundColor: '#fafbf8', borderWidth: 1, borderColor: '#dce3d8', borderRadius: 9, paddingVertical: 10, paddingLeft: 12, paddingRight: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  fieldCompact: { minHeight: 42 },
  fieldText: { flex: 1, fontSize: 13, color: '#1c302f' },
  fieldTextCompact: { fontSize: 10 },
  placeholder: { color: '#94a095' },
  disabled: { opacity: 0.65 },
  backdrop: { flex: 1, backgroundColor: '#102d2a75', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 440, backgroundColor: '#ffffff', borderRadius: 23, borderWidth: 1, borderColor: '#e5e9e3', padding: 18 },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, fontWeight: '700', color: '#5f7768', marginBottom: 8, marginLeft: 8 },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
  optionSelected: { backgroundColor: '#f3f6ed' },
  optionText: { fontSize: 14, color: '#1c302f' },
  optionTextSelected: { fontWeight: '700', color: '#165c4e' }
});
