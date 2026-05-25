using Avalonia.Controls;
using Clinica.Desktop.ViewModels;

namespace Clinica.Desktop.Views;

public partial class PacienteFormWindow : Window
{
    public PacienteFormWindow(PacienteFormViewModel vm)
    {
        InitializeComponent();
        DataContext = vm;
        vm.Cerrar += Close;
    }
}
