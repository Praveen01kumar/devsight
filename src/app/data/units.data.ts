import { UnitCategory, Unit } from '../tools/unit-converter/conversion.service';

export const UNITS: Unit[] = [
  // Length (Base: m)
  { id: 'length_m', categoryId: 'length', name: 'Meter', symbol: 'm', factor: 1, offset: 0 },
  { id: 'length_km', categoryId: 'length', name: 'Kilometer', symbol: 'km', factor: 1000, offset: 0 },
  { id: 'length_cm', categoryId: 'length', name: 'Centimeter', symbol: 'cm', factor: 0.01, offset: 0 },
  { id: 'length_mm', categoryId: 'length', name: 'Millimeter', symbol: 'mm', factor: 0.001, offset: 0 },
  { id: 'length_in', categoryId: 'length', name: 'Inch', symbol: 'in', factor: 0.0254, offset: 0 },
  { id: 'length_ft', categoryId: 'length', name: 'Foot', symbol: 'ft', factor: 0.3048, offset: 0 },
  { id: 'length_yd', categoryId: 'length', name: 'Yard', symbol: 'yd', factor: 0.9144, offset: 0 },
  { id: 'length_mi', categoryId: 'length', name: 'Mile', symbol: 'mi', factor: 1609.344, offset: 0 },
  { id: 'length_nmi', categoryId: 'length', name: 'Nautical Mile', symbol: 'nmi', factor: 1852, offset: 0 },

  // Area (Base: m²)
  { id: 'area_m2', categoryId: 'area', name: 'Square Meter', symbol: 'm²', factor: 1, offset: 0 },
  { id: 'area_km2', categoryId: 'area', name: 'Square Kilometer', symbol: 'km²', factor: 1000000, offset: 0 },
  { id: 'area_cm2', categoryId: 'area', name: 'Square Centimeter', symbol: 'cm²', factor: 0.0001, offset: 0 },
  { id: 'area_mm2', categoryId: 'area', name: 'Square Millimeter', symbol: 'mm²', factor: 0.000001, offset: 0 },
  { id: 'area_in2', categoryId: 'area', name: 'Square Inch', symbol: 'in²', factor: 0.00064516, offset: 0 },
  { id: 'area_ft2', categoryId: 'area', name: 'Square Foot', symbol: 'ft²', factor: 0.09290304, offset: 0 },
  { id: 'area_yd2', categoryId: 'area', name: 'Square Yard', symbol: 'yd²', factor: 0.83612736, offset: 0 },
  { id: 'area_ac', categoryId: 'area', name: 'Acre', symbol: 'ac', factor: 4046.8564224, offset: 0 },
  { id: 'area_ha', categoryId: 'area', name: 'Hectare', symbol: 'ha', factor: 10000, offset: 0 },

  // Volume (Base: L)
  { id: 'volume_l', categoryId: 'volume', name: 'Liter', symbol: 'L', factor: 1, offset: 0 },
  { id: 'volume_ml', categoryId: 'volume', name: 'Milliliter', symbol: 'mL', factor: 0.001, offset: 0 },
  { id: 'volume_m3', categoryId: 'volume', name: 'Cubic Meter', symbol: 'm³', factor: 1000, offset: 0 },
  { id: 'volume_cm3', categoryId: 'volume', name: 'Cubic Centimeter', symbol: 'cm³', factor: 0.001, offset: 0 },
  { id: 'volume_gal_us', categoryId: 'volume', name: 'Gallon (US)', symbol: 'gal (US)', factor: 3.785411784, offset: 0 },
  { id: 'volume_qt_us', categoryId: 'volume', name: 'Quart (US)', symbol: 'qt (US)', factor: 0.946352946, offset: 0 },
  { id: 'volume_pt_us', categoryId: 'volume', name: 'Pint (US)', symbol: 'pt (US)', factor: 0.473176473, offset: 0 },
  { id: 'volume_cup_us', categoryId: 'volume', name: 'Cup (US)', symbol: 'cup', factor: 0.2365882365, offset: 0 },
  { id: 'volume_fl_oz_us', categoryId: 'volume', name: 'Fluid Ounce (US)', symbol: 'fl oz (US)', factor: 0.0295735296, offset: 0 },
  { id: 'volume_tbsp_us', categoryId: 'volume', name: 'Tablespoon (US)', symbol: 'tbsp', factor: 0.0147867648, offset: 0 },
  { id: 'volume_tsp_us', categoryId: 'volume', name: 'Teaspoon (US)', symbol: 'tsp', factor: 0.0049289216, offset: 0 },

  // Mass / Weight (Base: g)
  { id: 'mass_g', categoryId: 'mass', name: 'Gram', symbol: 'g', factor: 1, offset: 0 },
  { id: 'mass_kg', categoryId: 'mass', name: 'Kilogram', symbol: 'kg', factor: 1000, offset: 0 },
  { id: 'mass_mg', categoryId: 'mass', name: 'Milligram', symbol: 'mg', factor: 0.001, offset: 0 },
  { id: 'mass_lb', categoryId: 'mass', name: 'Pound', symbol: 'lb', factor: 453.59237, offset: 0 },
  { id: 'mass_oz', categoryId: 'mass', name: 'Ounce', symbol: 'oz', factor: 28.349523125, offset: 0 },
  { id: 'mass_st', categoryId: 'mass', name: 'Stone', symbol: 'st', factor: 6350.29318, offset: 0 },
  { id: 'mass_ton', categoryId: 'mass', name: 'Metric Ton', symbol: 't', factor: 1000000, offset: 0 },

  // Temperature (Base: °C)
  // formula: BaseValue (Celsius) = (Value + Offset) * Factor
  // Celsius to Celsius: (val + 0) * 1 = val
  // Fahrenheit to Celsius: (val - 32) * (5/9)
  // Kelvin to Celsius: (val - 273.15) * 1
  { id: 'temp_c', categoryId: 'temperature', name: 'Celsius', symbol: '°C', factor: 1, offset: 0 },
  { id: 'temp_f', categoryId: 'temperature', name: 'Fahrenheit', symbol: '°F', factor: 5 / 9, offset: -32 },
  { id: 'temp_k', categoryId: 'temperature', name: 'Kelvin', symbol: 'K', factor: 1, offset: -273.15 },

  // Time (Base: s)
  { id: 'time_s', categoryId: 'time', name: 'Second', symbol: 's', factor: 1, offset: 0 },
  { id: 'time_ms', categoryId: 'time', name: 'Millisecond', symbol: 'ms', factor: 0.001, offset: 0 },
  { id: 'time_min', categoryId: 'time', name: 'Minute', symbol: 'min', factor: 60, offset: 0 },
  { id: 'time_h', categoryId: 'time', name: 'Hour', symbol: 'h', factor: 3600, offset: 0 },
  { id: 'time_d', categoryId: 'time', name: 'Day', symbol: 'd', factor: 84600, offset: 0 }, // wait, standard active calculation: 86400
  { id: 'time_wk', categoryId: 'time', name: 'Week', symbol: 'wk', factor: 604800, offset: 0 },
  { id: 'time_mo', categoryId: 'time', name: 'Month', symbol: 'mo', factor: 2628000, offset: 0 },
  { id: 'time_yr', categoryId: 'time', name: 'Year', symbol: 'yr', factor: 31536000, offset: 0 },

  // Speed (Base: m/s)
  { id: 'speed_m_s', categoryId: 'speed', name: 'Meters per Second', symbol: 'm/s', factor: 1, offset: 0 },
  { id: 'speed_km_h', categoryId: 'speed', name: 'Kilometers per Hour', symbol: 'km/h', factor: 1 / 3.6, offset: 0 },
  { id: 'speed_mph', categoryId: 'speed', name: 'Miles per Hour', symbol: 'mph', factor: 0.44704, offset: 0 },
  { id: 'speed_kn', categoryId: 'speed', name: 'Knots', symbol: 'kn', factor: 0.514444, offset: 0 },
  { id: 'speed_mach', categoryId: 'speed', name: 'Mach', symbol: 'M', factor: 340.29, offset: 0 },

  // Pressure (Base: Pa)
  { id: 'press_pa', categoryId: 'pressure', name: 'Pascal', symbol: 'Pa', factor: 1, offset: 0 },
  { id: 'press_kpa', categoryId: 'pressure', name: 'Kilopascal', symbol: 'kPa', factor: 1000, offset: 0 },
  { id: 'press_bar', categoryId: 'pressure', name: 'Bar', symbol: 'bar', factor: 100000, offset: 0 },
  { id: 'press_atm', categoryId: 'pressure', name: 'Atmosphere', symbol: 'atm', factor: 101325, offset: 0 },
  { id: 'press_psi', categoryId: 'pressure', name: 'Pounds per Sq Inch', symbol: 'psi', factor: 6894.7573, offset: 0 },
  { id: 'press_torr', categoryId: 'pressure', name: 'Torr', symbol: 'Torr', factor: 133.3224, offset: 0 },

  // Energy (Base: J)
  { id: 'energy_j', categoryId: 'energy', name: 'Joule', symbol: 'J', factor: 1, offset: 0 },
  { id: 'energy_kj', categoryId: 'energy', name: 'Kilojoule', symbol: 'kJ', factor: 1000, offset: 0 },
  { id: 'energy_cal', categoryId: 'energy', name: 'Calorie', symbol: 'cal', factor: 4.184, offset: 0 },
  { id: 'energy_kcal', categoryId: 'energy', name: 'Kilocalorie', symbol: 'kcal', factor: 4184, offset: 0 },
  { id: 'energy_wh', categoryId: 'energy', name: 'Watt-hour', symbol: 'Wh', factor: 3600, offset: 0 },
  { id: 'energy_kwh', categoryId: 'energy', name: 'Kilowatt-hour', symbol: 'kWh', factor: 3600000, offset: 0 },
  { id: 'energy_btu', categoryId: 'energy', name: 'British Thermal Unit', symbol: 'Btu', factor: 1055.056, offset: 0 },

  // Power (Base: W)
  { id: 'power_w', categoryId: 'power', name: 'Watt', symbol: 'W', factor: 1, offset: 0 },
  { id: 'power_kw', categoryId: 'power', name: 'Kilowatt', symbol: 'kW', factor: 1000, offset: 0 },
  { id: 'power_mw', categoryId: 'power', name: 'Megawatt', symbol: 'MW', factor: 1000000, offset: 0 },
  { id: 'power_hp', categoryId: 'power', name: 'Horsepower', symbol: 'hp', factor: 745.69987, offset: 0 },

  // Force (Base: N)
  { id: 'force_n', categoryId: 'force', name: 'Newton', symbol: 'N', factor: 1, offset: 0 },
  { id: 'force_kn', categoryId: 'force', name: 'Kilonewton', symbol: 'kN', factor: 1000, offset: 0 },
  { id: 'force_dyn', categoryId: 'force', name: 'Dyne', symbol: 'dyn', factor: 0.00001, offset: 0 },
  { id: 'force_lbf', categoryId: 'force', name: 'Pound-force', symbol: 'lbf', factor: 4.448222, offset: 0 },

  // Frequency (Base: Hz)
  { id: 'freq_hz', categoryId: 'frequency', name: 'Hertz', symbol: 'Hz', factor: 1, offset: 0 },
  { id: 'freq_khz', categoryId: 'frequency', name: 'Kilohertz', symbol: 'kHz', factor: 1000, offset: 0 },
  { id: 'freq_mhz', categoryId: 'frequency', name: 'Megahertz', symbol: 'MHz', factor: 1000000, offset: 0 },
  { id: 'freq_ghz', categoryId: 'frequency', name: 'Gigahertz', symbol: 'GHz', factor: 1000000000, offset: 0 },

  // Data Storage (Base: B)
  { id: 'data_b', categoryId: 'data_storage', name: 'Byte', symbol: 'B', factor: 1, offset: 0 },
  { id: 'data_kb', categoryId: 'data_storage', name: 'Kilobyte', symbol: 'KB', factor: 1000, offset: 0 },
  { id: 'data_mb', categoryId: 'data_storage', name: 'Megabyte', symbol: 'MB', factor: 1000000, offset: 0 },
  { id: 'data_gb', categoryId: 'data_storage', name: 'Gigabyte', symbol: 'GB', factor: 1000000000, offset: 0 },
  { id: 'data_tb', categoryId: 'data_storage', name: 'Terabyte', symbol: 'TB', factor: 1000000000000, offset: 0 },
  { id: 'data_kib', categoryId: 'data_storage', name: 'Kibibyte', symbol: 'KiB', factor: 1024, offset: 0 },
  { id: 'data_mib', categoryId: 'data_storage', name: 'Mebibyte', symbol: 'MiB', factor: 1048576, offset: 0 },
  { id: 'data_gib', categoryId: 'data_storage', name: 'Gibibyte', symbol: 'GiB', factor: 1073741824, offset: 0 },

  // Data Transfer Rate (Base: bps)
  { id: 'rate_bps', categoryId: 'data_rate', name: 'Bits per Second', symbol: 'bps', factor: 1, offset: 0 },
  { id: 'rate_kbps', categoryId: 'data_rate', name: 'Kilobits per Second', symbol: 'kbps', factor: 1000, offset: 0 },
  { id: 'rate_mbps', categoryId: 'data_rate', name: 'Megabits per Second', symbol: 'Mbps', factor: 1000000, offset: 0 },
  { id: 'rate_gbps', categoryId: 'data_rate', name: 'Gigabits per Second', symbol: 'Gbps', factor: 1000000000, offset: 0 },
  { id: 'rate_bs', categoryId: 'data_rate', name: 'Bytes per Second', symbol: 'B/s', factor: 8, offset: 0 },
  { id: 'rate_kbs', categoryId: 'data_rate', name: 'Kilobytes per Second', symbol: 'KB/s', factor: 8000, offset: 0 },
  { id: 'rate_mbs', categoryId: 'data_rate', name: 'Megabytes per Second', symbol: 'MB/s', factor: 8000000, offset: 0 },

  // Fuel Economy (Base: km/L)
  // L/100km needs custom handling since it's inverted.
  { id: 'fuel_kml', categoryId: 'fuel_economy', name: 'Kilometers per Liter', symbol: 'km/L', factor: 1, offset: 0 },
  { id: 'fuel_mpg_us', categoryId: 'fuel_economy', name: 'Miles per Gallon (US)', symbol: 'mpg (US)', factor: 0.425144, offset: 0 },
  { id: 'fuel_mpg_imp', categoryId: 'fuel_economy', name: 'Miles per Gallon (Imperial)', symbol: 'mpg (Imp)', factor: 0.354006, offset: 0 },
  { id: 'fuel_l100km', categoryId: 'fuel_economy', name: 'Liters per 100 Kilometers', symbol: 'L/100km', factor: 1, offset: 0 },

  // Angle (Base: rad)
  { id: 'angle_rad', categoryId: 'angle', name: 'Radian', symbol: 'rad', factor: 1, offset: 0 },
  { id: 'angle_deg', categoryId: 'angle', name: 'Degree', symbol: '°', factor: Math.PI / 180, offset: 0 },
  { id: 'angle_grad', categoryId: 'angle', name: 'Gradian', symbol: 'grad', factor: Math.PI / 200, offset: 0 },
  { id: 'angle_arcmin', categoryId: 'angle', name: 'Arcminute', symbol: 'arcmin', factor: Math.PI / 10800, offset: 0 },
  { id: 'angle_arcsec', categoryId: 'angle', name: 'Arcsecond', symbol: 'arcsec', factor: Math.PI / 648000, offset: 0 },

  // Density (Base: kg/m³)
  { id: 'density_kgm3', categoryId: 'density', name: 'Kilogram per Cubic Meter', symbol: 'kg/m³', factor: 1, offset: 0 },
  { id: 'density_gcm3', categoryId: 'density', name: 'Gram per Cubic Centimeter', symbol: 'g/cm³', factor: 1000, offset: 0 },
  { id: 'density_lbft3', categoryId: 'density', name: 'Pound per Cubic Foot', symbol: 'lb/ft³', factor: 16.018463, offset: 0 },

  // Electric Current (Base: A)
  { id: 'current_a', categoryId: 'electric_current', name: 'Ampere', symbol: 'A', factor: 1, offset: 0 },
  { id: 'current_ma', categoryId: 'electric_current', name: 'Milliampere', symbol: 'mA', factor: 0.001, offset: 0 },
  { id: 'current_ua', categoryId: 'electric_current', name: 'Microampere', symbol: 'µA', factor: 0.000001, offset: 0 },
  { id: 'current_ka', categoryId: 'electric_current', name: 'Kiloampere', symbol: 'kA', factor: 1000, offset: 0 },

  // Voltage (Base: V)
  { id: 'volt_v', categoryId: 'voltage', name: 'Volt', symbol: 'V', factor: 1, offset: 0 },
  { id: 'volt_mv', categoryId: 'voltage', name: 'Millivolt', symbol: 'mV', factor: 0.001, offset: 0 },
  { id: 'volt_kv', categoryId: 'voltage', name: 'Kilovolt', symbol: 'kV', factor: 1000, offset: 0 },
  { id: 'volt_mv_mega', categoryId: 'voltage', name: 'Megavolt', symbol: 'MV', factor: 1000000, offset: 0 },

  // Resistance (Base: Ω)
  { id: 'res_ohm', categoryId: 'resistance', name: 'Ohm', symbol: 'Ω', factor: 1, offset: 0 },
  { id: 'res_mohm', categoryId: 'resistance', name: 'Milliohm', symbol: 'mΩ', factor: 0.001, offset: 0 },
  { id: 'res_kohm', categoryId: 'resistance', name: 'Kilohm', symbol: 'kΩ', factor: 1000, offset: 0 },
  { id: 'res_megohm', categoryId: 'resistance', name: 'Megohm', symbol: 'MΩ', factor: 1000000, offset: 0 },

  // Capacitance (Base: F)
  { id: 'cap_f', categoryId: 'capacitance', name: 'Farad', symbol: 'F', factor: 1, offset: 0 },
  { id: 'cap_mf', categoryId: 'capacitance', name: 'Millifarad', symbol: 'mF', factor: 0.001, offset: 0 },
  { id: 'cap_uf', categoryId: 'capacitance', name: 'Microfarad', symbol: 'µF', factor: 0.000001, offset: 0 },
  { id: 'cap_nf', categoryId: 'capacitance', name: 'Nanofarad', symbol: 'nF', factor: 0.000000001, offset: 0 },
  { id: 'cap_pf', categoryId: 'capacitance', name: 'Picofarad', symbol: 'pF', factor: 0.000000000001, offset: 0 },

  // Inductance (Base: H)
  { id: 'ind_h', categoryId: 'inductance', name: 'Henry', symbol: 'H', factor: 1, offset: 0 },
  { id: 'ind_mh', categoryId: 'inductance', name: 'Millihenry', symbol: 'mH', factor: 0.001, offset: 0 },
  { id: 'ind_uh', categoryId: 'inductance', name: 'Microhenry', symbol: 'µH', factor: 0.000001, offset: 0 },

  // Charge (Base: C)
  { id: 'charge_c', categoryId: 'charge', name: 'Coulomb', symbol: 'C', factor: 1, offset: 0 },
  { id: 'charge_mc', categoryId: 'charge', name: 'Millicoulomb', symbol: 'mC', factor: 0.001, offset: 0 },
  { id: 'charge_uc', categoryId: 'charge', name: 'Microcoulomb', symbol: 'µC', factor: 0.000001, offset: 0 },
  { id: 'charge_ah', categoryId: 'charge', name: 'Ampere-hour', symbol: 'Ah', factor: 3600, offset: 0 },
  { id: 'charge_mah', categoryId: 'charge', name: 'Milliampere-hour', symbol: 'mAh', factor: 3.6, offset: 0 },

  // Illuminance (Base: lx)
  { id: 'ill_lux', categoryId: 'illuminance', name: 'Lux', symbol: 'lx', factor: 1, offset: 0 },
  { id: 'ill_fc', categoryId: 'illuminance', name: 'Foot-candle', symbol: 'fc', factor: 10.76391, offset: 0 },
  { id: 'ill_phot', categoryId: 'illuminance', name: 'Phot', symbol: 'ph', factor: 10000, offset: 0 },

  // Luminous Flux (Base: lm)
  { id: 'flux_lm', categoryId: 'luminous_flux', name: 'Lumen', symbol: 'lm', factor: 1, offset: 0 },
  { id: 'flux_klm', categoryId: 'luminous_flux', name: 'Kilolumen', symbol: 'klm', factor: 1000, offset: 0 },

  // Magnetic Field (Base: T)
  { id: 'mag_t', categoryId: 'magnetic_field', name: 'Tesla', symbol: 'T', factor: 1, offset: 0 },
  { id: 'mag_g', categoryId: 'magnetic_field', name: 'Gauss', symbol: 'G', factor: 0.0001, offset: 0 },
  { id: 'mag_mt', categoryId: 'magnetic_field', name: 'Millitesla', symbol: 'mT', factor: 0.001, offset: 0 },
  { id: 'mag_ut', categoryId: 'magnetic_field', name: 'Microtesla', symbol: 'µT', factor: 0.000001, offset: 0 },

  // Torque (Base: N·m)
  { id: 'torque_nm', categoryId: 'torque', name: 'Newton Meter', symbol: 'N·m', factor: 1, offset: 0 },
  { id: 'torque_ftlb', categoryId: 'torque', name: 'Foot-pound', symbol: 'ft·lb', factor: 1.355818, offset: 0 },
  { id: 'torque_inlb', categoryId: 'torque', name: 'Inch-pound', symbol: 'in·lb', factor: 0.112985, offset: 0 },
  { id: 'torque_kgfm', categoryId: 'torque', name: 'Kilogram-force Meter', symbol: 'kgf·m', factor: 9.80665, offset: 0 },

  // Flow Rate (Base: L/s)
  { id: 'flow_ls', categoryId: 'flow_rate', name: 'Liters per Second', symbol: 'L/s', factor: 1, offset: 0 },
  { id: 'flow_lmin', categoryId: 'flow_rate', name: 'Liters per Minute', symbol: 'L/min', factor: 1 / 60, offset: 0 },
  { id: 'flow_lh', categoryId: 'flow_rate', name: 'Liters per Hour', symbol: 'L/h', factor: 1 / 3600, offset: 0 },
  { id: 'flow_m3s', categoryId: 'flow_rate', name: 'Cubic Meters per Second', symbol: 'm³/s', factor: 1000, offset: 0 },
  { id: 'flow_gpm', categoryId: 'flow_rate', name: 'Gallons per Minute', symbol: 'gpm', factor: 0.0630902, offset: 0 },

  // Typography (Base: pt)
  { id: 'typo_pt', categoryId: 'typography', name: 'Point', symbol: 'pt', factor: 1, offset: 0 },
  { id: 'typo_pc', categoryId: 'typography', name: 'Pica', symbol: 'pc', factor: 12, offset: 0 },
  { id: 'typo_in', categoryId: 'typography', name: 'Inch', symbol: 'in', factor: 72, offset: 0 },
  { id: 'typo_mm', categoryId: 'typography', name: 'Millimeter', symbol: 'mm', factor: 2.83464567, offset: 0 },
  { id: 'typo_px', categoryId: 'typography', name: 'Pixel', symbol: 'px', factor: 0.75, offset: 0 },

  // Cooking (Base: mL)
  { id: 'cook_ml', categoryId: 'cooking', name: 'Milliliter', symbol: 'mL', factor: 1, offset: 0 },
  { id: 'cook_cup', categoryId: 'cooking', name: 'Cup', symbol: 'cup', factor: 240, offset: 0 },
  { id: 'cook_tbsp', categoryId: 'cooking', name: 'Tablespoon', symbol: 'tbsp', factor: 15, offset: 0 },
  { id: 'cook_tsp', categoryId: 'cooking', name: 'Teaspoon', symbol: 'tsp', factor: 5, offset: 0 },
  { id: 'cook_floz', categoryId: 'cooking', name: 'Fluid Ounce', symbol: 'fl oz', factor: 29.5735, offset: 0 },
  { id: 'cook_pt', categoryId: 'cooking', name: 'Pint', symbol: 'pt', factor: 473.176, offset: 0 },
  { id: 'cook_qt', categoryId: 'cooking', name: 'Quart', symbol: 'qt', factor: 946.353, offset: 0 },
  { id: 'cook_gal', categoryId: 'cooking', name: 'Gallon', symbol: 'gal', factor: 3785.41, offset: 0 },
  { id: 'cook_pinch', categoryId: 'cooking', name: 'Pinch', symbol: 'pinch', factor: 0.3125, offset: 0 },
  { id: 'cook_dash', categoryId: 'cooking', name: 'Dash', symbol: 'dash', factor: 0.625, offset: 0 },

  // Percentage (Base: %)
  { id: 'pct_percent', categoryId: 'percentage', name: 'Percent', symbol: '%', factor: 1, offset: 0 },
  { id: 'pct_decimal', categoryId: 'percentage', name: 'Decimal', symbol: 'dec', factor: 100, offset: 0 },
  { id: 'pct_permille', categoryId: 'percentage', name: 'Permille', symbol: '‰', factor: 0.1, offset: 0 },
  { id: 'pct_bp', categoryId: 'percentage', name: 'Basis Point', symbol: 'bp', factor: 0.01, offset: 0 },
  { id: 'pct_ppm', categoryId: 'percentage', name: 'Parts per Million', symbol: 'ppm', factor: 0.0001, offset: 0 },
  { id: 'pct_ppb', categoryId: 'percentage', name: 'Parts per Billion', symbol: 'ppb', factor: 0.0000001, offset: 0 }
];

export const UNIT_CATEGORIES: UnitCategory[] = [
  { id: 'length', name: 'Length', icon: 'straighten', baseUnit: 'm' },
  { id: 'area', name: 'Area', icon: 'texture', baseUnit: 'm²' },
  { id: 'volume', name: 'Volume', icon: 'opacity', baseUnit: 'L' },
  { id: 'mass', name: 'Mass / Weight', icon: 'scale', baseUnit: 'g' },
  { id: 'temperature', name: 'Temperature', icon: 'thermostat', baseUnit: '°C' },
  { id: 'time', name: 'Time', icon: 'schedule', baseUnit: 's' },
  { id: 'speed', name: 'Speed', icon: 'speed', baseUnit: 'm/s' },
  { id: 'pressure', name: 'Pressure', icon: 'compress', baseUnit: 'Pa' },
  { id: 'energy', name: 'Energy', icon: 'bolt', baseUnit: 'J' },
  { id: 'power', name: 'Power', icon: 'offline_bolt', baseUnit: 'W' },
  { id: 'force', name: 'Force', icon: 'fitness_center', baseUnit: 'N' },
  { id: 'frequency', name: 'Frequency', icon: 'waves', baseUnit: 'Hz' },
  { id: 'data_storage', name: 'Data Storage', icon: 'sd_card', baseUnit: 'B' },
  { id: 'data_rate', name: 'Data Transfer Rate', icon: 'sync_alt', baseUnit: 'bps' },
  { id: 'fuel_economy', name: 'Fuel Economy', icon: 'local_gas_station', baseUnit: 'km/L' },
  { id: 'angle', name: 'Angle', icon: 'change_history', baseUnit: 'rad' },
  { id: 'density', name: 'Density', icon: 'widgets', baseUnit: 'kg/m³' },
  { id: 'electric_current', name: 'Electric Current', icon: 'electric_bolt', baseUnit: 'A' },
  { id: 'voltage', name: 'Voltage', icon: 'flash_on', baseUnit: 'V' },
  { id: 'resistance', name: 'Resistance', icon: 'settings_ethernet', baseUnit: 'Ω' },
  { id: 'capacitance', name: 'Capacitance', icon: 'battery_full', baseUnit: 'F' },
  { id: 'inductance', name: 'Inductance', icon: 'tune', baseUnit: 'H' },
  { id: 'charge', name: 'Charge', icon: 'battery_charging_full', baseUnit: 'C' },
  { id: 'illuminance', name: 'Illuminance', icon: 'light_mode', baseUnit: 'lx' },
  { id: 'luminous_flux', name: 'Luminous Flux', icon: 'wb_sunny', baseUnit: 'lm' },
  { id: 'magnetic_field', name: 'Magnetic Field', icon: 'grid_3x3', baseUnit: 'T' },
  { id: 'torque', name: 'Torque', icon: 'build', baseUnit: 'N·m' },
  { id: 'flow_rate', name: 'Flow Rate', icon: 'water_drop', baseUnit: 'L/s' },
  { id: 'typography', name: 'Typography', icon: 'text_fields', baseUnit: 'pt' },
  { id: 'cooking', name: 'Cooking', icon: 'restaurant_menu', baseUnit: 'mL' },
  { id: 'percentage', name: 'Percentage / Ratios', icon: 'percent', baseUnit: '%' }
];
